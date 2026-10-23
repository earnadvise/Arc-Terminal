import { NextResponse } from 'next/server';

const API_URL = process.env.EXTENDED_API_URL ?? 'https://api.arc.extended.exchange/api/v1';
const API_KEY = process.env.EXTENDED_API_KEY ?? '';

export async function POST(req: Request) {
  if (!API_KEY) {
    return NextResponse.json({ status: 'err', response: 'EXTENDED_API_KEY not configured.' }, { status: 500 });
  }
  try {
    const body = await req.json();
    const res = await fetch(`${API_URL}/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    console.log('[Extended order response]', JSON.stringify(data));
    return NextResponse.json({ status: 'ok', response: data });
  } catch (error: any) {
    console.error('[Extended order error]', error);
    return NextResponse.json({ status: 'err', response: error?.message ?? 'Order failed' }, { status: 500 });
  }
}
