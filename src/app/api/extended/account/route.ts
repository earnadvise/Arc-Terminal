import { NextResponse } from 'next/server';

const EXTENDED_API = 'https://api.starknet.extended.exchange/api/v1';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { endpoint, method, token, payload } = body;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Origin': 'https://app.extended.exchange',
      'Referer': 'https://app.extended.exchange/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${EXTENDED_API}${endpoint}`, {
      method: method ?? 'GET',
      headers,
      body: payload ? JSON.stringify(payload) : undefined,
    });

    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    console.log(`[Extended proxy] ${method} ${endpoint} → ${res.status}`, JSON.stringify(data).slice(0, 200));
    return NextResponse.json({ status: res.ok ? 'ok' : 'err', httpStatus: res.status, response: data });

  } catch (error: any) {
    console.error('[Extended proxy error]', error);
    return NextResponse.json({ status: 'err', response: error?.message }, { status: 500 });
  }
}
