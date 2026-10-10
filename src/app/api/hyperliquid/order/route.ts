import { NextResponse } from 'next/server';
import { Hyperliquid } from 'hyperliquid';

const AGENT_PRIVATE_KEY = process.env.HL_AGENT_PRIVATE_KEY;

export async function POST(req: Request) {
  if (!AGENT_PRIVATE_KEY) {
    return NextResponse.json({ status: 'err', response: 'Agent key not configured on server.' }, { status: 500 });
  }

  try {
    const { symbol, isBuy, sz, limitPx, orderType } = await req.json();

    if (!symbol || typeof isBuy !== 'boolean' || !sz || !limitPx) {
      return NextResponse.json({ status: 'err', response: 'Missing required fields.' }, { status: 400 });
    }

    const sdk = new Hyperliquid({
      privateKey: AGENT_PRIVATE_KEY,
      testnet: false,
    });

    const result = await sdk.exchange.placeOrder({
      coin:        symbol,
      is_buy:      isBuy,
      sz:          Number(sz),
      limit_px:    Number(limitPx),
      order_type:  { limit: { tif: 'Ioc' } },
      reduce_only: false,
    });

    return NextResponse.json({ status: 'ok', response: result });

  } catch (error: any) {
    console.error('[HL order error]', error);
    return NextResponse.json(
      { status: 'err', response: error?.message ?? 'Order failed' },
      { status: 500 },
    );
  }
}
