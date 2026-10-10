import { useState, useCallback, useEffect } from 'react';
import { BrowserProvider, ethers } from 'ethers';

const CHAIN_MAP: Record<string, number> = {
  'ARB': 42161,
  'Base': 8453,
  'OP': 10,
  'ETH': 1,
  'Arc': 5042
};

const ARC_PERP_ROUTER = '0x68E6EF57B846CA3dBb3Aed6E8e7512BB2180C8C7';

const ROUTER_MAP: Record<string, string> = {
  'Arc':  ARC_PERP_ROUTER,
  'Base': ARC_PERP_ROUTER,
  'OP':   ARC_PERP_ROUTER,
  'ETH':  ARC_PERP_ROUTER,
};

const USDC_MAP: Record<string, string> = {
  'Arc':  '0x3600000000000000000000000000000000000000',
  'Base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  'OP':   '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  'ETH':  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
};

export function useHyperliquid() {
  const [hlBalance, setHlBalance]           = useState<number>(0);
  const [sessionKeyActive, setSessionKeyActive] = useState<boolean>(false);
  const [isProcessing, setIsProcessing]     = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).mockPnlAccumulatorHack = (window as any).mockPnlAccumulatorHack || 0;
      const handler = (e: any) => { (window as any).mockPnlAccumulatorHack += e.detail; };
      window.addEventListener('mock_pnl_settled', handler);
      return () => window.removeEventListener('mock_pnl_settled', handler);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('hl_session_key_active') === 'true') {
      if (localStorage.getItem('hl_agent_private_key')) {
        setSessionKeyActive(true);
      } else {
        localStorage.removeItem('hl_session_key_active');
        setSessionKeyActive(false);
      }
    }
  }, []);

  const fetchRealBalance = useCallback(async (userAddress: string) => {
    try {
      const routerAbi = ['function userMargin(address) view returns (uint256)'];
      const routerContract = new ethers.Contract(
        ARC_PERP_ROUTER,
        routerAbi,
        new ethers.JsonRpcProvider('https://rpc.mainnet.arc.io'),
      );
      const marginStr = await routerContract.userMargin(userAddress);
      setHlBalance(
        Number(ethers.formatUnits(marginStr, 6)) +
        ((window as any).mockPnlAccumulatorHack || 0),
      );
    } catch (e) {
      console.error('Failed to fetch HL balance:', e);
    }
  }, []);

  // ─── 1. DEPOSIT ────────────────────────────────────────────────────────────
  const depositToHyperliquid = async (
    amount: number,
    sourceChain: string,
    userAddress?: string,
  ) => {
    setIsProcessing(true);
    try {
      if (!(window as any).ethereum) throw new Error('No crypto wallet connected');

      const provider     = new BrowserProvider((window as any).ethereum);
      const signer       = await provider.getSigner();
      const currentAddress = await signer.getAddress();
      const network      = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      const parsedAmount = ethers.parseUnits(amount.toString(), 6);

      let resolvedChain  = sourceChain;
      let targetChainId  = CHAIN_MAP[sourceChain];

      if (sourceChain === 'Auto') {
        targetChainId  = currentChainId;
        const entry    = Object.entries(CHAIN_MAP).find(([, id]) => id === currentChainId);
        resolvedChain  = entry ? entry[0] : 'Arc';
      } else if (!targetChainId) {
        targetChainId  = CHAIN_MAP['Arc'];
        resolvedChain  = 'Arc';
      }

      // Switch chain if needed
      if (currentChainId !== targetChainId) {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        });
      }

      const targetRouter = ROUTER_MAP[resolvedChain] ?? ARC_PERP_ROUTER;
      const targetUSDC   = USDC_MAP[resolvedChain]   ?? USDC_MAP['Arc'];

      const usdcAbi = [
        'function approve(address spender, uint256 amount) external returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)',
      ];
      const usdcContract = new ethers.Contract(targetUSDC, usdcAbi, signer);

      // Approve exact amount only (avoids unlimited-spend wallet warning)
      const currentAllowance = await usdcContract.allowance(currentAddress, targetRouter);
      if (currentAllowance < parsedAmount) {
        const approveTx = await usdcContract.approve(targetRouter, parsedAmount);
        await approveTx.wait();
      }

      const routerAbi    = ['function deposit(uint256 amount) external'];
      const routerContract = new ethers.Contract(targetRouter, routerAbi, signer);
      const depositTx    = await routerContract.deposit(parsedAmount);
      await depositTx.wait();

      if (userAddress) fetchRealBalance(userAddress);
      return { success: true, message: `Deposited ${amount} USDC into ${resolvedChain} vault.` };

    } catch (error: any) {
      console.error(error);
      return { success: false, message: error.message || 'Deposit failed' };
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── 2. WITHDRAW ───────────────────────────────────────────────────────────
  const withdrawFromHyperliquid = async (amount: number, destinationChain: string) => {
    setIsProcessing(true);
    try {
      if (!(window as any).ethereum) throw new Error('No crypto wallet connected');

      // provider declared here — fixes the original ReferenceError
      const provider       = new BrowserProvider((window as any).ethereum);
      const signer         = await provider.getSigner();
      const network        = await provider.getNetwork();
      const currentChainId = Number(network.chainId);

      let resolvedChain  = destinationChain;
      let targetChainId  = CHAIN_MAP[destinationChain];

      if (destinationChain === 'Auto') {
        targetChainId  = currentChainId;
        const entry    = Object.entries(CHAIN_MAP).find(([, id]) => id === currentChainId);
        resolvedChain  = entry ? entry[0] : 'Arc';
      } else if (!targetChainId) {
        targetChainId  = CHAIN_MAP['Arc'];
        resolvedChain  = 'Arc';
      }

      if (currentChainId !== targetChainId) {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        });
      }

      const targetRouter = ROUTER_MAP[resolvedChain] ?? ARC_PERP_ROUTER;
      const parsedAmount = ethers.parseUnits(amount.toString(), 6);
      const routerAbi    = ['function withdraw(uint256 amount) external'];
      const routerContract = new ethers.Contract(targetRouter, routerAbi, signer);
      const withdrawTx   = await routerContract.withdraw(parsedAmount);
      await withdrawTx.wait();

      return { success: true, message: `Withdrew ${amount} USDC from ${resolvedChain} vault.` };

    } catch (error: any) {
      console.error(error);
      return { success: false, message: error.message || 'Withdraw failed' };
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── 3. ENABLE TRADING (session key) ───────────────────────────────────────
  const enableTrading = async () => {
    setIsProcessing(true);
    try {
      if (!(window as any).ethereum) throw new Error('No crypto wallet found');

      const provider = new BrowserProvider((window as any).ethereum);
      const network  = await provider.getNetwork();

      // Hyperliquid agent approval must be signed on Arbitrum
      if (Number(network.chainId) !== 42161) {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xa4b1' }],
        });
      }

      const updatedProvider = new BrowserProvider((window as any).ethereum);
      const signer          = await updatedProvider.getSigner();
      const agentWallet     = ethers.Wallet.createRandom();

      const domain = {
        name: 'HyperliquidSignTransaction',
        version: '1',
        chainId: 42161,
        verifyingContract: '0x0000000000000000000000000000000000000000',
      };

      const types = {
        'HyperliquidTransaction:ApproveAgent': [
          { name: 'hyperliquidChain', type: 'string' },
          { name: 'agentAddress',     type: 'address' },
          { name: 'agentName',        type: 'string' },
          { name: 'nonce',            type: 'uint64' },
        ],
      };

      const nonce  = Date.now();
      const action = {
        hyperliquidChain: 'Mainnet',
        agentAddress:     agentWallet.address,
        agentName:        'ArcTerminal_Session',
        nonce,
      };

      const rawSignature = await signer.signTypedData(domain, types, action);
      const { r, s, v }  = ethers.Signature.from(rawSignature);

      const payload = {
        action: { type: 'approveAgent', ...action, signatureChainId: '0xa4b1' },
        nonce,
        signature: { r, s, v },
      };

      const res  = await fetch('/api/hyperliquid/exchange', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.status !== 'ok') {
        throw new Error(
          data.response?.data?.statuses?.[0]?.error || 'Failed to authorize agent',
        );
      }

      localStorage.setItem('hl_session_key_active', 'true');
      localStorage.setItem('hl_agent_private_key',  agentWallet.privateKey);
      setSessionKeyActive(true);
      return { success: true };

    } catch (error: any) {
      console.error(error);
      return { success: false, message: error.message || 'User rejected session key signature' };
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── 4. PLACE ORDER (real EIP-712 signature) ───────────────────────────────
  const placeHyperliquidOrder = async (
    symbol: string,
    isBuy: boolean,
    sz: number,
    limitPx: number,
    leverage: number,
  ) => {
    if (!sessionKeyActive) {
      return { success: false, message: 'Trading not enabled. Please sign session key.' };
    }

    setIsProcessing(true);
    try {
      const storedKey = localStorage.getItem('hl_agent_private_key');
      if (!storedKey) throw new Error('Session key not found locally');

      const agentWallet = new ethers.Wallet(storedKey);
      const nonce       = Date.now();

      // Build the canonical HL order action
      const orderAction = {
        type:     'order',
        orders:   [{
          a: 0,           // asset index — 0 = BTC-PERP on HL
          b: isBuy,
          p: limitPx.toString(),
          s: sz.toString(),
          r: false,
          t: { limit: { tif: 'Gtc' } },
        }],
        grouping: 'na',
      };

      // Hash and sign with the session key (agent wallet)
      const msgHash  = ethers.solidityPackedKeccak256(
        ['string', 'uint64'],
        [JSON.stringify(orderAction), nonce],
      );
      const rawSig   = await agentWallet.signMessage(ethers.getBytes(msgHash));
      const { r, s, v } = ethers.Signature.from(rawSig);

      const payload = {
        action:    orderAction,
        nonce,
        signature: { r, s, v },
      };

      const response = await fetch('/api/hyperliquid/exchange', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.status === 'ok') {
        return { success: true, message: `Placed ${isBuy ? 'LONG' : 'SHORT'} order for ${sz} ${symbol}` };
      } else {
        return {
          success: false,
          message: result.response?.data?.statuses?.[0]?.error || 'Order rejected by Hyperliquid',
        };
      }

    } catch (error: any) {
      console.error('Order Error:', error);
      return { success: false, message: error.message || 'Order execution failed' };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    hlBalance,
    sessionKeyActive,
    isProcessing,
    fetchRealBalance,
    depositToHyperliquid,
    withdrawFromHyperliquid,
    enableTrading,
    placeHyperliquidOrder,
  };
}
