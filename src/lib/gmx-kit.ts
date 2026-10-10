import { useState } from 'react';
import { BrowserProvider, ethers } from 'ethers';

const ARB_CHAIN_ID    = 42161;
const ARB_CHAIN_HEX   = '0xa4b1';
const USDC_ARB        = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const GMX_ROUTER      = '0x7452c558d45f8afc8c83dae62C3a6e3f8f8E6a10'; // GMX v2 ExchangeRouter on Arbitrum
const GMX_ORDER_VAULT = '0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5'; // OrderVault

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
];

const GMX_ROUTER_ABI = [
  'function multicall(bytes[] calldata data) payable returns (bytes[] memory)',
  'function sendWnt(address receiver, uint256 amount) payable',
  'function sendTokens(address token, address receiver, uint256 amount)',
  'function createOrder((address receiver, address cancellationReceiver, address callbackContract, address uiFeeReceiver, address market, address initialCollateralToken, address[] swapPath, uint256 sizeDeltaUsd, uint256 initialCollateralDeltaAmount, uint256 triggerPrice, uint256 acceptablePrice, uint256 executionFee, uint256 callbackGasLimit, uint256 minOutputAmount, uint256 validFromTime, bool isLong, bool shouldUnwrapNativeToken, bool decreasePositionSwapType, uint8 orderType, uint8 decreasePositionSwapPath) params) payable returns (bytes32)',
];

async function switchToArbitrum(): Promise<void> {
  const eth = (window as any).ethereum;
  try {
    await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ARB_CHAIN_HEX }] });
  } catch (e: any) {
    if (e.code === 4902) {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: ARB_CHAIN_HEX,
          chainName: 'Arbitrum One',
          rpcUrls: ['https://arb1.arbitrum.io/rpc'],
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          blockExplorerUrls: ['https://arbiscan.io'],
        }],
      });
    } else throw e;
  }
}

export function useGmx() {
  const [isProcessing, setIsProcessing] = useState(false);

  const placeGmxOrder = async (
    symbol:       string,
    isLong:       boolean,
    sizeUsd:      number,   // position size in USD
    collateral:   number,   // margin in USD (USDC)
    userAddress:  string,
  ) => {
    setIsProcessing(true);
    try {
      if (!(window as any).ethereum) throw new Error('No wallet connected');

      // 1. Switch to Arbitrum
      await switchToArbitrum();
      const provider = new BrowserProvider((window as any).ethereum);
      const network  = await provider.getNetwork();
      if (Number(network.chainId) !== ARB_CHAIN_ID) throw new Error('Please switch to Arbitrum One');

      const signer = await provider.getSigner();

      // 2. Check USDC balance on Arbitrum
      const usdc = new ethers.Contract(USDC_ARB, ERC20_ABI, signer);
      const usdcBalance: bigint = await usdc.balanceOf(userAddress);
      const collateralWei = ethers.parseUnits(collateral.toString(), 6);
      if (usdcBalance < collateralWei) {
        return { success: false, message: `Insufficient USDC on Arbitrum. You have ${ethers.formatUnits(usdcBalance, 6)} USDC. Bridge more from Arc first.` };
      }

      // 3. Fetch GMX order params from server
      const paramsRes = await fetch('/api/gmx/order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          symbol,
          isLong,
          sizeDeltaUsd: (sizeUsd * 1e30).toFixed(0),  // GMX uses 1e30 for USD
          userAddress,
        }),
      });
      const paramsData = await paramsRes.json();
      if (paramsData.status !== 'ok') throw new Error(paramsData.response ?? 'Failed to get order params');

      const { marketAddress, collateralToken, acceptablePrice, executionFee } = paramsData.orderParams;

      // 4. Approve USDC to GMX OrderVault
      const currentAllowance: bigint = await usdc.allowance(userAddress, GMX_ORDER_VAULT);
      if (currentAllowance < collateralWei) {
        const approveTx = await usdc.approve(GMX_ORDER_VAULT, collateralWei);
        await approveTx.wait();
      }

      // 5. Send USDC collateral to OrderVault
      const sendTokensData = new ethers.Interface([
        'function sendTokens(address token, address receiver, uint256 amount)',
      ]).encodeFunctionData('sendTokens', [USDC_ARB, GMX_ORDER_VAULT, collateralWei]);

      // 6. Create the GMX market order
      const createOrderData = new ethers.Interface([
        `function createOrder(tuple(
          address receiver,
          address cancellationReceiver,
          address callbackContract,
          address uiFeeReceiver,
          address market,
          address initialCollateralToken,
          address[] swapPath,
          uint256 sizeDeltaUsd,
          uint256 initialCollateralDeltaAmount,
          uint256 triggerPrice,
          uint256 acceptablePrice,
          uint256 executionFee,
          uint256 callbackGasLimit,
          uint256 minOutputAmount,
          uint256 validFromTime,
          bool isLong,
          bool shouldUnwrapNativeToken,
          bool decreasePositionSwapType,
          uint8 orderType,
          uint8 decreasePositionSwapPath
        ) params) payable returns (bytes32)`,
      ]).encodeFunctionData('createOrder', [{
        receiver:                     userAddress,
        cancellationReceiver:         userAddress,
        callbackContract:             ethers.ZeroAddress,
        uiFeeReceiver:                ethers.ZeroAddress,
        market:                       marketAddress,
        initialCollateralToken:       collateralToken,
        swapPath:                     [],
        sizeDeltaUsd:                 BigInt(paramsData.orderParams.sizeDeltaUsd),
        initialCollateralDeltaAmount: collateralWei,
        triggerPrice:                 0n,
        acceptablePrice:              BigInt(acceptablePrice),
        executionFee:                 BigInt(executionFee),
        callbackGasLimit:             0n,
        minOutputAmount:              0n,
        validFromTime:                0n,
        isLong,
        shouldUnwrapNativeToken:      false,
        decreasePositionSwapType:     false,
        orderType:                    2,  // MarketIncrease
        decreasePositionSwapPath:     0,
      }]);

      // 7. Multicall: sendWnt (execution fee) + sendTokens + createOrder
      const sendWntData = new ethers.Interface([
        'function sendWnt(address receiver, uint256 amount) payable',
      ]).encodeFunctionData('sendWnt', [GMX_ORDER_VAULT, BigInt(executionFee)]);

      const router = new ethers.Contract(GMX_ROUTER, [
        'function multicall(bytes[] calldata data) payable returns (bytes[] memory)',
      ], signer);

      const tx = await router.multicall(
        [sendWntData, sendTokensData, createOrderData],
        { value: BigInt(executionFee) }
      );
      const receipt = await tx.wait();

      return {
        success: true,
        message: `${isLong ? 'Long' : 'Short'} position opened on GMX. Tx: ${receipt.hash.slice(0,10)}...`,
        txHash:  receipt.hash,
      };

    } catch (error: any) {
      console.error('[GMX order error]', error);
      return { success: false, message: error?.message ?? 'GMX order failed' };
    } finally {
      setIsProcessing(false);
    }
  };

  return { isProcessing, placeGmxOrder };
}
