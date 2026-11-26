import { NextRequest, NextResponse } from 'next/server';

// Same-origin proxy for Extended's API. Browsers cannot call it directly (no CORS).
// It holds no secrets: the user's own API key and wallet signatures arrive in request
// headers and are passed through. Only Extended's public and user endpoints are reachable.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EXTENDED_API = 'https://api.starknet.extended.exchange';

const ALLOWED_PREFIXES = ['api/v1/info/', 'api/v1/user/'];
const ALLOWED_EXACT = ['auth/onboard'];

const FORWARDED_HEADERS = [
  'content-type',
  'x-api-key',
  'l1_signature',
  'l1_message_time',
  'x-x10-active-account',
];

function isAllowed(path: string): boolean {
  if (path.includes('..')) return false;
  return ALLOWED_EXACT.includes(path) || ALLOWED_PREFIXES.some((p) => path.startsWith(p));
}

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const target = path.join('/');
  if (!isAllowed(target)) {
    return NextResponse.json({ status: 'ERROR', error: { message: 'Path not allowed' } }, { status: 403 });
  }

  const headers = new Headers({ 'User-Agent': 'Mozilla/5.0 (compatible; ArcTerminal/1.0)' });
  for (const name of FORWARDED_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Pass the visitor's address on so Extended can enforce its own regional restrictions.
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip');
  if (clientIp) headers.set('x-forwarded-for', clientIp);

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  try {
    const upstream = await fetch(`${EXTENDED_API}/${target}${req.nextUrl.search}`, {
      method: req.method,
      headers,
      body: hasBody ? await req.text() : undefined,
      cache: 'no-store',
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
    });
  } catch {
    return NextResponse.json({ status: 'ERROR', error: { message: 'Extended is unreachable' } }, { status: 502 });
  }
}

export { handle as GET, handle as POST, handle as DELETE, handle as PATCH };
