import Decimal from 'decimal.js';
import {
  EXTENDED_STARKNET_DOMAIN,
  MARKET_ORDER_BUFFER,
  ORDER_TTL_MS,
  SETTLEMENT_BUFFER_MS,
} from './config';
import { orderMessageHash, signHash } from './stark';

export interface ExtendedMarket {
  name: string;
  active: boolean;
  marketStats: { bidPrice: string; askPrice: string; markPrice: string };
  tradingConfig: { minOrderSize: string; minOrderSizeChange: string; minPriceChange: string; maxLeverage: string };
  l2Config: { collateralId: string; collateralResolution: number; syntheticId: string; syntheticResolution: number };
}

export interface SigningAccount {
  vault: number;
  publicKey: string;
  privateKey: string;
}

export interface OrderRequest {
  market: ExtendedMarket;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'MARKET';
  qty: string;
  /** Required for LIMIT. For MARKET it is ignored and a crossing price is derived from the book. */
  price?: string;
  reduceOnly?: boolean;
  takerFeeRate: string;
  builderId: number;
  builderFee: string;
}

const scale = (value: Decimal, resolution: number, mode: Decimal.Rounding): Decimal =>
  value.mul(resolution).toDecimalPlaces(0, mode);

const stepRound = (value: Decimal, step: string, mode: Decimal.Rounding): Decimal => {
  const s = new Decimal(step);
  return value.div(s).toDecimalPlaces(0, mode).mul(s);
};

/** Crossing limit price for a market order, rounded to the market tick. */
export function marketOrderPrice(market: ExtendedMarket, side: 'BUY' | 'SELL'): Decimal {
  const { bidPrice, askPrice, markPrice } = market.marketStats;
  const tick = market.tradingConfig.minPriceChange;
  if (side === 'BUY') {
    const base = new Decimal(askPrice || markPrice);
    return stepRound(base.mul(1 + MARKET_ORDER_BUFFER), tick, Decimal.ROUND_UP);
  }
  const base = new Decimal(bidPrice || markPrice);
  return stepRound(base.mul(1 - MARKET_ORDER_BUFFER), tick, Decimal.ROUND_DOWN);
}

/** Build and Stark-sign the body for POST /api/v1/user/order. */
export function buildSignedOrder(account: SigningAccount, req: OrderRequest, now = Date.now()) {
  const { market, side } = req;
  const isBuy = side === 'BUY';

  const qty = stepRound(new Decimal(req.qty), market.tradingConfig.minOrderSizeChange, Decimal.ROUND_DOWN);
  if (qty.lt(market.tradingConfig.minOrderSize)) {
    throw new Error(`Minimum order size for ${market.name} is ${market.tradingConfig.minOrderSize}`);
  }

  const price =
    req.type === 'MARKET'
      ? marketOrderPrice(market, side)
      : stepRound(
          new Decimal(req.price ?? '0'),
          market.tradingConfig.minPriceChange,
          isBuy ? Decimal.ROUND_DOWN : Decimal.ROUND_UP,
        );
  if (!price.gt(0)) throw new Error('Invalid order price');

  const rounding = isBuy ? Decimal.ROUND_UP : Decimal.ROUND_DOWN;
  const { syntheticResolution, collateralResolution, syntheticId, collateralId } = market.l2Config;

  let starkSynthetic = scale(qty, syntheticResolution, rounding);
  let starkCollateral = scale(qty.mul(price), collateralResolution, rounding);
  const collateralHuman = qty.mul(price);
  const totalFeeRate = new Decimal(req.takerFeeRate).plus(req.builderFee);
  const starkFee = scale(collateralHuman.mul(totalFeeRate), collateralResolution, Decimal.ROUND_UP);

  if (isBuy) starkCollateral = starkCollateral.neg();
  else starkSynthetic = starkSynthetic.neg();

  const expiryMs = now + ORDER_TTL_MS;
  const settlementExpiry = Math.ceil((expiryMs + SETTLEMENT_BUFFER_MS) / 1000);
  const nonce = Math.floor(Math.random() * 2 ** 32);

  const hash = orderMessageHash({
    positionId: account.vault,
    baseAssetId: syntheticId,
    baseAmount: starkSynthetic.toFixed(0),
    quoteAssetId: collateralId,
    quoteAmount: starkCollateral.toFixed(0),
    feeAssetId: collateralId,
    feeAmount: starkFee.toFixed(0),
    expiration: settlementExpiry,
    salt: nonce,
    userPublicKey: account.publicKey,
    domain: EXTENDED_STARKNET_DOMAIN,
  });
  const signature = signHash(account.privateKey, hash);

  return {
    id: hash.toString(),
    market: market.name,
    type: req.type,
    side,
    qty: qty.toString(),
    price: price.toString(),
    postOnly: false,
    timeInForce: req.type === 'MARKET' ? 'IOC' : 'GTT',
    expiryEpochMillis: expiryMs,
    fee: req.takerFeeRate,
    selfTradeProtectionLevel: 'ACCOUNT',
    nonce: String(nonce),
    settlement: {
      signature,
      starkKey: account.publicKey,
      collateralPosition: String(account.vault),
    },
    debuggingAmounts: {
      collateralAmount: starkCollateral.toFixed(0),
      feeAmount: starkFee.toFixed(0),
      syntheticAmount: starkSynthetic.toFixed(0),
    },
    reduceOnly: req.reduceOnly ?? false,
    builderFee: req.builderFee,
    builderId: req.builderId,
  };
}
