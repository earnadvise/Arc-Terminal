import { NextResponse } from 'next/server';

const GMX_API = 'https://arbitrum-api.gmxinfra.io';

// GMX market addresses on Arbitrum
const GMX_MARKETS: Record<string, string> = {
  BTC:  '0x47c031236e19d024b42f8AE6780E44A573170703',
  ETH:  '0x70d95587d40A2caf56bd97485aB3Eec10Bee6336',
  SOL:  '0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9',
  ARB:  '0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407',
  AVAX: '0x7BbBf946883a5701350007320F525c5379B8178A',
};

// USDC on Arbitrum
const USDC_ARB = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

export async function POST(req: Request) {
  try {
    const { symbol, isLong, sizeDeltaUsd, userAddress } = await req.json();

    if (!symbol || typeof isLong !== 'boolean' || !sizeDeltaUsd || !userAddress) {
      return NextResponse.json({ status: 'err', response: 'Missing required fields.' }, { status: 400 });
    }

    const coin = symbol.split(/[-/]/)[0].toUpperCase();
    const marketAddress = GMX_MARKETS[coin];

    if (!marketAddress) {
      return NextResponse.json({
        status: 'err',
        response: `Unsupported market: ${coin}. Supported: ${Object.keys(GMX_MARKETS).join(', ')}`
      }, { status: 400 });
    }

    // Fetch current mark price from GMX
    const pricesRes = await fetch(`${GMX_API}/prices/tickers`);
    const prices    = await pricesRes.json();
    const ticker    = prices.find((p: any) => p.tokenSymbol === coin);

    if (!ticker) {
      return NextResponse.json({ status: 'err', response: `No price for ${coin}` }, { status: 400 });
    }

    const markPrice      = (BigInt(ticker.maxPrice) + BigInt(ticker.minPrice)) / 2n;
    const acceptablePrice = isLong
      ? markPrice * 101n / 100n   // 1% slippage long
      : markPrice * 99n  / 100n;  // 1% slippage short

    // Return order params for the frontend to sign and submit
    return NextResponse.json({
      status: 'ok',
      orderParams: {
        marketAddress,
        collateralToken: USDC_ARB,
        isLong,
        sizeDeltaUsd:     sizeDeltaUsd.toString(),
        initialCollateral: '0',
        acceptablePrice:  acceptablePrice.toString(),
        executionFee:     '300000000000000', // 0.0003 ETH
        markPrice:        markPrice.toString(),
      }
    });

  } catch (error: any) {
    console.error('[GMX order params error]', error);
    return NextResponse.json({ status: 'err', response: error?.message ?? 'Failed' }, { status: 500 });
  }
}
