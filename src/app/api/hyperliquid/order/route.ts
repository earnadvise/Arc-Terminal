import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const AGENT_PRIVATE_KEY = process.env.HL_AGENT_PRIVATE_KEY;
const HL_INFO_URL     = 'https://api.hyperliquid.xyz/info';
const HL_EXCHANGE_URL = 'https://api.hyperliquid.xyz/exchange';

// Hyperliquid L1 signing — msgpack + EIP-712 Agent pattern
function msgpackEncode(value: unknown): Uint8Array {
  const buf: number[] = [];
  function write(v: unknown): void {
    if (v === null || v === undefined) { buf.push(0xc0); }
    else if (typeof v === 'boolean') { buf.push(v ? 0xc3 : 0xc2); }
    else if (typeof v === 'number') {
      if (Number.isInteger(v) && v >= 0 && v <= 0x7f) { buf.push(v); }
      else if (Number.isInteger(v) && v >= 0 && v <= 0xffff) { buf.push(0xcd, (v>>8)&0xff, v&0xff); }
      else if (Number.isInteger(v) && v >= 0 && v <= 0xffffffff) { buf.push(0xce,(v>>>24)&0xff,(v>>>16)&0xff,(v>>>8)&0xff,v&0xff); }
      else { buf.push(0xcb); const dv=new DataView(new ArrayBuffer(8)); dv.setFloat64(0,v,false); for(let i=0;i<8;i++) buf.push(dv.getUint8(i)); }
    } else if (typeof v === 'string') {
      const bytes = new TextEncoder().encode(v); const len = bytes.length;
      if (len<=31) buf.push(0xa0|len); else if(len<=0xff) buf.push(0xd9,len); else buf.push(0xda,(len>>8)&0xff,len&0xff);
      for (const b of bytes) buf.push(b);
    } else if (Array.isArray(v)) {
      const len=v.length; if(len<=15) buf.push(0x90|len); else buf.push(0xdd,0,0,(len>>8)&0xff,len&0xff);
      for (const item of v) write(item);
    } else if (typeof v === 'object') {
      const entries=Object.entries(v as object); const len=entries.length;
      if(len<=15) buf.push(0x80|len); else buf.push(0xdf,0,0,(len>>8)&0xff,len&0xff);
      for (const [k,val] of entries) { write(k); write(val); }
    }
  }
  write(value);
  return new Uint8Array(buf);
}

async function signHlAction(wallet: ethers.Wallet, action: unknown, nonce: number): Promise<{r:string,s:string,v:number}> {
  const encoded  = msgpackEncode(action);
  const nonceBuf = new Uint8Array(8);
  const dv       = new DataView(nonceBuf.buffer);
  dv.setUint32(0, Math.floor(nonce / 2**32), false);
  dv.setUint32(4, nonce >>> 0, false);
  const combined = new Uint8Array(encoded.length + 9);
  combined.set(encoded); combined.set(nonceBuf, encoded.length); combined[encoded.length+8] = 0x00;
  const connectionId = ethers.keccak256(combined);

  const domain = { name:'Exchange', version:'1', chainId:1337, verifyingContract:'0x0000000000000000000000000000000000000000' };
  const types  = { Agent: [{ name:'source', type:'string' }, { name:'connectionId', type:'bytes32' }] };
  const msg    = { source:'a', connectionId };
  const raw    = await wallet.signTypedData(domain, types, msg);
  const sig    = ethers.Signature.from(raw);
  return { r: sig.r, s: sig.s, v: sig.v };
}

export async function POST(req: Request) {
  if (!AGENT_PRIVATE_KEY) {
    return NextResponse.json({ status:'err', response:'HL_AGENT_PRIVATE_KEY not set on server.' }, { status:500 });
  }

  try {
    const { symbol, isBuy, sz, limitPx } = await req.json();
    if (!symbol || typeof isBuy !== 'boolean' || !sz || !limitPx) {
      return NextResponse.json({ status:'err', response:'Missing required fields.' }, { status:400 });
    }

    // Resolve asset index from HL meta
    const metaRes  = await fetch(HL_INFO_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({type:'meta'}) });
    const meta     = await metaRes.json();
    const assetIdx = (meta.universe as any[]).findIndex((a: any) => a.name === symbol);
    if (assetIdx === -1) {
      return NextResponse.json({ status:'err', response:`Unknown asset: ${symbol}. Available: ${(meta.universe as any[]).map((a:any)=>a.name).join(', ')}` }, { status:400 });
    }

    const wallet = new ethers.Wallet(AGENT_PRIVATE_KEY);
    const nonce  = Date.now();

    const orderAction = {
      type:     'order',
      orders:   [{ a: assetIdx, b: isBuy, p: limitPx.toFixed(5), s: sz.toFixed(6), r: false, t: { limit: { tif: 'Ioc' } } }],
      grouping: 'na',
    };

    const signature = await signHlAction(wallet, orderAction, nonce);

    const hlRes = await fetch(HL_EXCHANGE_URL, {
      method:  'POST',
      headers: { 'Content-Type':'application/json' },
      body:    JSON.stringify({ action: orderAction, nonce, signature }),
    });
    const result = await hlRes.json();
    return NextResponse.json({ status:'ok', response: result });

  } catch (error: any) {
    console.error('[HL order error]', error);
    return NextResponse.json({ status:'err', response: error?.message ?? 'Order failed' }, { status:500 });
  }
}
