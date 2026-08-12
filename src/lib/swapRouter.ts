import { rpcCall, rpcGetReceipt } from './rpcClient';
/**
 * Arc Testnet Swap Router Utilities
 *
 * ABI-encoding helpers and constants for interacting with the
 * SynthraV3 (Uniswap V3 fork) SwapRouter on Arc Testnet.
 *
 * This is the same router infrastructure used by Tower Exchange.
 * Discovered from Tower tx 0x225198... decoded_input.
 */

// ─── Token Registry ───────────────────────────────────────────────
export const ARC_TOKENS: Record<string, { address: string; decimals: number; name: string }> = {
  USDC:   { address: '0x3600000000000000000000000000000000000000', decimals: 6,  name: 'USD Coin' },
  USDT:   { address: '0x175CdB1D338945f0D851A741ccF787D343E57952', decimals: 18, name: 'Tether USD' },
  EURC:   { address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a', decimals: 6,  name: 'Euro Coin' },
  cirBTC: { address: '0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF', decimals: 8,  name: 'Circle BTC' },
};

// Arc Terminal Router on Arc Testnet (Our custom protocol proxy contract)
// This contract handles protocol fees and routes the remaining liquidity to SynthraV3
export const SWAP_ROUTER_ADDRESS = '0xd22c3fCB7896F219c8f4Cb6F68db395E3ca39b52';

// Discovered on-chain pools from SynthraV3Factory
export const POOLS: Record<string, { address: string; fee: number }> = {
  'USDT-USDC': { address: '0x715f78de0cea7428a5ede4a0c491b05e7a8caff2', fee: 3000 },
  'USDC-USDT': { address: '0x715f78de0cea7428a5ede4a0c491b05e7a8caff2', fee: 3000 },
  'USDC-EURC': { address: '0xc4abb91884094972fc6634c0d91bb9f9332277f1', fee: 500 },
  'EURC-USDC': { address: '0xc4abb91884094972fc6634c0d91bb9f9332277f1', fee: 500 },
  'USDT-EURC': { address: '0xe9f855550da7f85c5fe9fe1c160c7e90f72c0e89', fee: 500 },
  'EURC-USDT': { address: '0xe9f855550da7f85c5fe9fe1c160c7e90f72c0e89', fee: 500 },
  'USDT-cirBTC': { address: '0xf2ab7914b00aefc8c324ffd8e1fb7e32b542ba8a', fee: 500 },
  'cirBTC-USDT': { address: '0xf2ab7914b00aefc8c324ffd8e1fb7e32b542ba8a', fee: 500 },
  'USDC-cirBTC': { address: '0x4301aba1ae52614a3412cac2e1a780e346d2cff9', fee: 10000 },
  'cirBTC-USDC': { address: '0x4301aba1ae52614a3412cac2e1a780e346d2cff9', fee: 10000 },
  'EURC-cirBTC': { address: '0x035641936aac893dab0cb6e506c36ecc07b53702', fee: 3000 },
  'cirBTC-EURC': { address: '0x035641936aac893dab0cb6e506c36ecc07b53702', fee: 3000 },
};

/** Get the pool fee tier for a given token pair. Defaults to 3000 if not found. */
export function getPoolFee(tokenInSymbol: string, tokenOutSymbol: string): number {
  const pairKey = `${tokenInSymbol}-${tokenOutSymbol}`;
  return POOLS[pairKey]?.fee || 3000;
}

/** Get the pool address for a given token pair. */
export function getPoolAddress(tokenInSymbol: string, tokenOutSymbol: string): string | null {
  const pairKey = `${tokenInSymbol}-${tokenOutSymbol}`;
  return POOLS[pairKey]?.address || null;
}


// ─── Low-Level Helpers ────────────────────────────────────────────
export const padAddress = (addr: string) =>
  addr.toLowerCase().replace('0x', '').padStart(64, '0');

const padUint = (val: bigint) => val.toString(16).padStart(64, '0');

/** Convert a human-readable amount to its on-chain wei representation. */
export function toWei(amount: number, decimals: number): bigint {
  const [whole = '0', frac = ''] = amount.toFixed(decimals).split('.');
  return BigInt(whole + frac);
}

/** Convert wei back to a human-readable number. */
export function fromWei(wei: bigint, decimals: number): number {
  return Number(wei) / 10 ** decimals;
}

// ─── Real-Swap Capability Check ──────────────────────────────────
/** Returns true if both tokens have known Arc Testnet ERC-20 addresses. */
export function isRealSwapSupported(tokenIn: string, tokenOut: string): boolean {
  return (
    !!ARC_TOKENS[tokenIn] &&
    !!ARC_TOKENS[tokenOut] &&
    tokenIn !== tokenOut
  );
}

// ─── ERC-20 Allowance ─────────────────────────────────────────────
/** Read the current ERC-20 allowance for `owner → spender` via direct RPC. */
export async function checkAllowance(
  _ethereum: any,
  tokenAddress: string,
  owner: string,
  spender: string,
): Promise<bigint> {
  // allowance(address owner, address spender) → selector 0xdd62ed3e
  const data = '0xdd62ed3e' + padAddress(owner) + padAddress(spender);
  const result = await rpcCall(tokenAddress, data);
  if (!result) return BigInt(0);
  return BigInt(result);
}

// ─── ERC-20 Approve Encoding ──────────────────────────────────────
/** ABI-encode an `approve(address,uint256)` call. */
export function encodeApprove(spender: string, amount: bigint): string {
  return '0x095ea7b3' + padAddress(spender) + padUint(amount);
}

/** Max uint256 — used for unlimited (one-time) approval. */
export const MAX_UINT256 = BigInt(
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
);

// ─── exactInputSingle (Uniswap V3 SwapRouter02) ──────────────────
/**
 * Generates ABI-encoded calldata for ArcRouter swapExactInputSingle
 *
 * Signature: swapExactInputSingle(address tokenIn, address tokenOut, uint24 poolFee, uint256 amountIn, uint256 amountOutMinimum)
 * Selector: 0x65650ea1
 */
export function encodeExactInputSingle(
  tokenIn: string,
  tokenOut: string,
  fee: number,
  amountIn: bigint,
  amountOutMinimum: bigint
): string {
  return (
    '0x65650ea1' +
    padAddress(tokenIn) +
    padAddress(tokenOut) +
    padUint(BigInt(fee)) +
    padUint(amountIn) +
    padUint(amountOutMinimum)
  );
}

// ─── Query Pool Price ─────────────────────────────────────────────
/**
 * Query the Uniswap V3 pool slot0 to get the real-time exchange rate.
 * Uses direct RPC — no wallet provider needed for read-only calls.
 */
export async function getPoolExchangeRate(
  _ethereum: any,
  tokenInSymbol: string,
  tokenOutSymbol: string,
): Promise<number> {
  const poolAddress = getPoolAddress(tokenInSymbol, tokenOutSymbol);
  if (!poolAddress) return 1.0;

  try {
    // slot0() selector: 0x3850c7bd
    const result = await rpcCall(poolAddress, '0x3850c7bd');
    if (!result) return 1.0;

    const raw = result.replace('0x', '');
    const sqrtPriceX96Hex = raw.substring(0, 64);
    const sqrtPriceX96 = BigInt('0x' + sqrtPriceX96Hex);
    if (sqrtPriceX96 === BigInt(0)) return 1.0;

    const Q96 = BigInt(2) ** BigInt(96);
    const priceRatio = Number(sqrtPriceX96) / Number(Q96);
    const priceRatioSquared = priceRatio * priceRatio;
    
    const tIn = ARC_TOKENS[tokenInSymbol];
    const tOut = ARC_TOKENS[tokenOutSymbol];
    if (!tIn || !tOut) return 1.0;

    const isTokenInToken0 = tIn.address.toLowerCase().localeCompare(tOut.address.toLowerCase()) < 0;
    
    // priceRatioSquared = token1_amount_wei / token0_amount_wei
    // We want tokenOut_amount / tokenIn_amount
    const decimals0 = isTokenInToken0 ? tIn.decimals : tOut.decimals;
    const decimals1 = isTokenInToken0 ? tOut.decimals : tIn.decimals;

    const token1PerToken0 = priceRatioSquared * Math.pow(10, decimals0 - decimals1);

    if (isTokenInToken0) {
      return token1PerToken0;
    } else {
      return 1 / token1PerToken0;
    }
  } catch (e) {
    console.error('Error fetching pool price:', e);
  }
  return 1.0; // fallback to 1:1 if RPC fails
}

// ─── Calculate Minimum Output ─────────────────────────────────────
/**
 * Estimate the minimum acceptable output for a token pair
 * adjusted by the pool exchange rate, pool fee, and user slippage.
 */
export function calculateMinOutput(
  amountIn: number,
  tokenInDecimals: number,
  tokenOutDecimals: number,
  slippagePercent: number,
  poolExchangeRate: number,
): bigint {
  const expectedOutAmount = amountIn * poolExchangeRate;
  const expectedOutWei = toWei(expectedOutAmount, tokenOutDecimals);

  // Deduct pool fee (0.3%) and user-defined slippage
  const afterPoolFee = (expectedOutWei * BigInt(997)) / BigInt(1000);
  const slipBps = BigInt(Math.floor((100 - slippagePercent) * 100));
  return (afterPoolFee * slipBps) / BigInt(10000);
}

// ─── Wait for Transaction Receipt ─────────────────────────────────
/** Poll via direct RPC until a transaction is mined (or timeout after ~60 s). */
export async function waitForTransaction(
  _ethereum: any,
  txHash: string,
  maxAttempts = 30,
  intervalMs = 2000,
): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const receipt = await rpcGetReceipt(txHash);
      if (receipt) {
        if (receipt.status === '0x0') {
          throw new Error('Transaction reverted on-chain');
        }
        return receipt;
      }
    } catch (e: any) {
      if (e.message === 'Transaction reverted on-chain') throw e;
      // Other errors (RPC hiccups) — keep polling
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Transaction confirmation timeout (60 s)');
}

