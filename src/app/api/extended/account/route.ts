import { NextResponse } from 'next/server';

function getApiUrl(): string {
  const envUrl = process.env.EXTENDED_API_URL;
  if (!envUrl || envUrl.includes('api.arc.extended.exchange')) {
    return 'https://api.starknet.extended.exchange/api/v1';
  }
  return envUrl;
}

const API_URL = getApiUrl();
const API_KEY = process.env.EXTENDED_API_KEY ?? '';

// GET — fetch account info for a wallet address
export async function GET(req: Request) {
  if (!API_KEY) return NextResponse.json({ status: 'err', response: 'Not configured.' }, { status: 500 });
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');
    if (!wallet) return NextResponse.json({ status: 'err', response: 'Missing wallet' }, { status: 400 });

    const res = await fetch(`${API_URL}/user/account/info?ethAddress=${wallet}`, {
      headers: { 
        'Authorization': `Bearer ${API_KEY}`,
        'X-API-Key': API_KEY,
        'X-Api-Key': API_KEY,
      },
    });

    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { message: text }; }

    if (!res.ok) {
      const errMsg = data?.error?.message ?? data?.message ?? JSON.stringify(data);
      return NextResponse.json({ status: 'err', response: errMsg }, { status: res.status });
    }
    return NextResponse.json({ status: 'ok', response: data });
  } catch (error: any) {
    return NextResponse.json({ status: 'err', response: error?.message }, { status: 500 });
  }
}

// POST — onboard a new user (register their wallet with Extended)
export async function POST(req: Request) {
  if (!API_KEY) return NextResponse.json({ status: 'err', response: 'Not configured.' }, { status: 500 });
  try {
    const { wallet, starkKey, signature, nonce } = await req.json();
    if (!wallet || !starkKey || !signature) {
      return NextResponse.json({ status: 'err', response: 'Missing required fields.' }, { status: 400 });
    }

    // Register the user's wallet with Extended
    const res = await fetch(`${API_URL}/user/account/register`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-API-Key':     API_KEY,
        'X-Api-Key':     API_KEY,
      },
      body: JSON.stringify({ ethAddress: wallet, starkKey, signature, nonce }),
    });

    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { message: text }; }
    console.log('[Extended onboard]', JSON.stringify(data));

    if (!res.ok) {
      const errMsg = data?.error?.message ?? data?.message ?? JSON.stringify(data);
      return NextResponse.json({ status: 'err', response: errMsg }, { status: res.status });
    }
    return NextResponse.json({ status: 'ok', response: data });
  } catch (error: any) {
    console.error('[Extended onboard error]', error);
    return NextResponse.json({ status: 'err', response: error?.message }, { status: 500 });
  }
}
