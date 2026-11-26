import type { StarknetDomain } from './stark';

// Extended settles on Arc now, but its API host and Stark signing scheme are unchanged.
// Browsers cannot call the host directly (no CORS), so every call goes through /api/extended.
export const EXTENDED_PROXY_BASE = '/api/extended';

/** Domain name used for the wallet's EIP-712 onboarding signatures. */
export const EXTENDED_SIGNING_DOMAIN = 'extended.exchange';

/** Host string Extended expects in the account registration message. */
export const EXTENDED_ONBOARDING_HOST = 'https://api.starknet.extended.exchange';

export const EXTENDED_STARKNET_DOMAIN: StarknetDomain = {
  name: 'Perpetuals',
  version: 'v0',
  chainId: 'SN_MAIN',
  revision: '1',
};

/** Builder code: public identifier of your Extended client account. */
export const EXTENDED_BUILDER_ID = Number(process.env.NEXT_PUBLIC_EXTENDED_BUILDER_ID ?? '30');

/** Builder fee charged on top of Extended's taker fee, as a fraction (0.0005 = 0.05%). */
export const EXTENDED_BUILDER_FEE = Number(process.env.NEXT_PUBLIC_EXTENDED_BUILDER_FEE ?? '0.0005');

/** Crossing buffer applied to the best bid/ask for market orders (Extended UI uses 1.5%). */
export const MARKET_ORDER_BUFFER = 0.015;

/** Orders stay valid for this long. */
export const ORDER_TTL_MS = 60 * 60 * 1000;

/** Settlement expiry is the order expiry plus this buffer. */
export const SETTLEMENT_BUFFER_MS = 14 * 24 * 60 * 60 * 1000;

export const toMarketName = (symbol: string): string => `${symbol.split(/[-/]/)[0].toUpperCase()}-USD`;
