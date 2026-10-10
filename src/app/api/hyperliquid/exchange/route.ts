import { NextResponse } from 'next/server';

const HL_EXCHANGE_URL = 'https://api.hyperliquid.xyz/exchange';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const hlRes = await fetch(HL_EXCHANGE_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    const data = await hlRes.json();
    return NextResponse.json(data, { status: hlRes.status });

  } catch (error: any) {
    console.error('Hyperliquid exchange proxy error:', error);
    return NextResponse.json(
      { status: 'err', response: error?.message ?? 'Proxy error' },
      { status: 500 },
    );
  }
}
