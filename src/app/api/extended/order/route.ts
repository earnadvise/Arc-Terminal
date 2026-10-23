import { NextResponse } from 'next/server';

function getApiUrl(): string {
  const envUrl = process.env.EXTENDED_API_URL;
  if (!envUrl || envUrl.includes('api.arc.extended.exchange')) {
    return 'https://api.starknet.extended.exchange/api/v1';
  }
  return envUrl;
}

const API_URL     = getApiUrl();
const API_KEY     = process.env.EXTENDED_API_KEY     ?? '';
const BUILDER_ID  = process.env.EXTENDED_BUILDER_ID  ?? '';
const VAULT_NUM   = process.env.EXTENDED_VAULT_NUMBER ?? '42';
const BUILDER_FEE = 0.0005; // 0.05% — adjust up to max allowed

export async function POST(req: Request) {
  if (!API_KEY) return NextResponse.json({ status: 'err', response: 'EXTENDED_API_KEY not set.' }, { status: 500 });

  try {
    const body = await req.json();

    // Inject builder code into every order
    const orderPayload = {
      ...body,
      ...(BUILDER_ID ? { builderId: Number(BUILDER_ID), builderFee: BUILDER_FEE } : {}),
    };

    const res = await fetch(`${API_URL}/order`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-API-Key':     API_KEY,
        'X-Api-Key':     API_KEY,
        'X-Vault-Id':    VAULT_NUM,
      },
      body: JSON.stringify(orderPayload),
    });

    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { message: text }; }
    console.log('[Extended order]', JSON.stringify(data));

    if (!res.ok) {
      const errMsg = data?.error?.message ?? data?.message ?? JSON.stringify(data);
      return NextResponse.json({ status: 'err', response: errMsg }, { status: res.status });
    }
    return NextResponse.json({ status: 'ok', response: data });

  } catch (error: any) {
    console.error('[Extended order error]', error);
    return NextResponse.json({ status: 'err', response: error?.message ?? 'Order failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!API_KEY) return NextResponse.json({ status: 'err', response: 'Not configured.' }, { status: 500 });
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('id');
    if (!orderId) return NextResponse.json({ status: 'err', response: 'Missing order id' }, { status: 400 });
    const res = await fetch(`${API_URL}/order/${orderId}`, {
      method:  'DELETE',
      headers: { 
        'Authorization': `Bearer ${API_KEY}`,
        'X-API-Key':     API_KEY,
        'X-Api-Key':     API_KEY,
        'X-Vault-Id':    VAULT_NUM,
      },
    });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { message: text }; }
    return NextResponse.json({ status: 'ok', response: data });
  } catch (error: any) {
    return NextResponse.json({ status: 'err', response: error?.message ?? 'Cancel failed' }, { status: 500 });
  }
}
