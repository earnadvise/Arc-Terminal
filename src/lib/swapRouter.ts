import { rpcCall, rpcGetReceipt } from './rpcClient';
/**
 * Arc Mainnet Swap Router Utilities
 *
 * ABI-encoding helpers and constants for interacting with the
 * SynthraV3 (Uniswap V3 fork) SwapRouter on Arc Mainnet.
 *
 * This is the same router infrastructure used by Tower Exchange.
 * Discovered from Tower tx 0x225198... decoded_input.
 */

export const ARC_TOKENS: Record<string, { address: string; decimals: number; name: string }> = {
  "USDC": { "address": "0x3600000000000000000000000000000000000000", "decimals": 6, "name": "USDC" },
  "cirBTC": { "address": "0x171A4217b86A807A64eB94757Db6849fb4bDbAA0", "decimals": 8, "name": "cirBTC" },
  "EURC": { "address": "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1", "decimals": 6, "name": "Eurc" },
  "ARCASH": { "address": "0x0BFFa97f774824e9dA843699aEDd2835cb1b8022", "decimals": 18, "name": "ARCASH" },
  "ARCANINE": { "address": "0xF3715bF5C2De299F08B81180ffb739A8372a175f", "decimals": 18, "name": "Arcanine" },
  "ARCBAT": { "address": "0xbE0CaD585Ea2D13DE2f4E36376be755C0AfD8B97", "decimals": 18, "name": "ARC BAT" },
  "ARCAT": { "address": "0x07704B06981eA962b87296362a1281484d160000", "decimals": 18, "name": "ARCAT" },
  "arcUSDC": { "address": "0x8E357432CC12ff425c36432F312968aEb16112AF", "decimals": 18, "name": "Flagship USDC" },
  "Architects": { "address": "0x8bcb94279FC2c984EC34e0C1f2192df8c69EA4F0", "decimals": 18, "name": "Architects" },
  "BUILDOG": { "address": "0x4cb8382b9dAF7992d3b27D32f7dB650C57881DaA", "decimals": 18, "name": "BUILDOG" },
  "TOLLY": { "address": "0xBc43CE8DEc648EA298C4275559b81D6261c90b67", "decimals": 18, "name": "Tolly" },
  "STEVE": { "address": "0xA23632D6a32174fF4EE8E76aAcf9f244E10cFd73", "decimals": 18, "name": "STEVE" },
  "BEANCAT": { "address": "0x41c8A71f630c636294009fa4FB0CC4c3bBE674fe", "decimals": 18, "name": "Bean Cat" },
  "ARGUS": { "address": "0xeCe5cA8bf9220718E5727754026757512212cb3c", "decimals": 18, "name": "Argus" },
  "dUSDC": { "address": "0x6bdfE1165D5165808d02dE05969c9a19e9b7cf30", "decimals": 18, "name": "Dialectic RWA USDC" },
  "BARC": { "address": "0x4753C45Fb550FECAA143A47968659117E6FFc2cE", "decimals": 18, "name": "Barc" },
  "LONGCAT": { "address": "0x79E4561edE9f21f5cb7D9445e0F8b20b9ad05A31", "decimals": 18, "name": "Longcat" },
  "LONG": { "address": "0x2164bB17a2D38c1b5170E987b2c0416DF1EFc752", "decimals": 18, "name": "LONG" },
  "steakUSDC": { "address": "0xbeef0016cb2Fd5C352ea7CA08a9f54739DFa7298", "decimals": 18, "name": "Steakhouse Prime USDC" },
  "krUSDC": { "address": "0x5bEfAb92a5A3D60F578Cb51EEb4e4FD50a1e3123", "decimals": 18, "name": "Keyrock Prime USDC" },
  "steakEURC": { "address": "0xbeef00be37BdE921BAE06fad223125BAB16c41D1", "decimals": 18, "name": "Steakhouse Prime EURC" },
  "gtusdcp": { "address": "0xdECcd53BE5453215821184824B519E04C7e00bC7", "decimals": 18, "name": "Gauntlet USDC Prime" },
  "CRCL": { "address": "0x2ba0f44BDfC17FbA30edA9cdBeCB908cA45B043B", "decimals": 18, "name": "Circle Internet Group • Arc Token" },
  "COOL": { "address": "0xEb64987643db71c76b2a2BE7E723DECC995E5b37", "decimals": 18, "name": "usdc is cool" },
  "arcEURC": { "address": "0x389abDf4355e0cF4f19298179991705a98f21c18", "decimals": 18, "name": "Galaxy EURC" },
  "pUSDC": { "address": "0x9503d4Eccee1046610eC1467F58b6Bc23fce157e", "decimals": 18, "name": "Pangolins USDC" },
  "gteurcp": { "address": "0x05863F54B05e96092069eF30c9Ca6060336e50B9", "decimals": 18, "name": "Gauntlet EURC Prime" },
  "waCoreUSDC": { "address": "0x42EAB64310E1D1c66b4d8aF7C9C4ce253885eB83", "decimals": 6, "name": "Wrapped Aave Core USDC" },
  "waCoreEURC": { "address": "0x5A10b1533C0f1f181DC8a428BF5Eb58B08fc8d2c", "decimals": 6, "name": "Wrapped Aave Core EURC" },
  "waCorecirBTC": { "address": "0x83D364DbAf4e7018E0b87dB3FaB3d1d8535a6F13", "decimals": 8, "name": "Wrapped Aave Core cirBTC" },
  "PEG": { "address": "0xD626630Dc244e50272017Cc55A361d096c3a9062", "decimals": 18, "name": "peg" },
  "BANCOR": { "address": "0xc55A4468A3E1C2dfe58dDdaD0188c71D5dFFd740", "decimals": 18, "name": "BANCOR" },
  "AROS": { "address": "0xcDF59E06DCbC3A6AE662F66B35aAeBd8DECCCB2C", "decimals": 18, "name": "Aros" },
  "LAZY": { "address": "0xD6509e6B2c2C3494bEc027D81952E5079112adc6", "decimals": 18, "name": "Arc's Chameleon" },
  "PI": { "address": "0x30aC39DeC8a854c5Fd03AA429E3BEF32a7E4c84a", "decimals": 18, "name": "3.141592653589793238462643383279" },
  "AI": { "address": "0xcaC4098684Cc7FC6BeA101D9B9c641cfA7D783EA", "decimals": 18, "name": "ARC Investor" },
  "wARS": { "address": "0x0DC4F92879B7670e5f4e4e6e3c801D229129D90D", "decimals": 18, "name": "Peso Argentino" }
};

// Arc Terminal Router on Arc Mainnet (Our custom protocol proxy contract)
// This contract handles protocol fees and routes the remaining liquidity to SynthraV3
export const SWAP_ROUTER_ADDRESS = '0x2de601bE529C4D59DC2b11725a2c75e06aC4cDBa';

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
/** Returns true if both tokens have known Arc Mainnet ERC-20 addresses. */
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
  if (!poolAddress) return 0;

  try {
    // slot0() selector: 0x3850c7bd
    const result = await rpcCall(poolAddress, '0x3850c7bd');
    if (!result) return 0;

    const raw = result.replace('0x', '');
    const sqrtPriceX96Hex = raw.substring(0, 64);
    const sqrtPriceX96 = BigInt('0x' + sqrtPriceX96Hex);
    if (sqrtPriceX96 === BigInt(0)) return 0;

    const Q96 = BigInt(2) ** BigInt(96);
    const priceRatio = Number(sqrtPriceX96) / Number(Q96);
    const priceRatioSquared = priceRatio * priceRatio;
    
    const tIn = ARC_TOKENS[tokenInSymbol];
    const tOut = ARC_TOKENS[tokenOutSymbol];
    if (!tIn || !tOut) return 0;

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
  return 0; // fallback to 0 if RPC fails
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

