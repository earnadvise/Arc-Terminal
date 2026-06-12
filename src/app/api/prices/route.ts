import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface PriceData {
  lastPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

export async function GET() {
  const result: Record<string, PriceData> = {};

  // 1. Fetch Crypto + Gold spot (PAXG) from Binance
  try {
    const binanceRes = await fetch(
      'https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22,%22SUIUSDT%22,%22APTUSDT%22,%22PAXGUSDT%22%5D',
      { next: { revalidate: 0 } }
    );
    if (binanceRes.ok) {
      const data = await binanceRes.json();
      data.forEach((item: any) => {
        const symbolMap: Record<string, string> = {
          BTCUSDT: 'BTC-PERP',
          ETHUSDT: 'ETH-PERP',
          SOLUSDT: 'SOL-PERP',
          SUIUSDT: 'SUI-PERP',
          APTUSDT: 'APT-PERP',
          PAXGUSDT: 'xau-PERP'
        };
        const internalSymbol = symbolMap[item.symbol];
        if (internalSymbol) {
          result[internalSymbol] = {
            lastPrice: parseFloat(item.lastPrice),
            change24h: parseFloat(item.priceChangePercent),
            high24h: parseFloat(item.highPrice),
            low24h: parseFloat(item.lowPrice),
            volume24h: Math.round(parseFloat(item.quoteVolume)),
          };
        }
      });

      // Map ARC-PERP to BTCUSDT price to match TradingView chart fallback
      if (result['BTC-PERP']) {
        result['ARC-PERP'] = {
          ...result['BTC-PERP'],
        };
      }

      // Generate Silver (xag-PERP) based on Gold (PAXG) price
      if (result['xau-PERP']) {
        const gold = result['xau-PERP'];
        result['xag-PERP'] = {
          lastPrice: parseFloat((gold.lastPrice / 79.5).toFixed(3)),
          change24h: gold.change24h,
          high24h: parseFloat((gold.high24h / 79.5).toFixed(3)),
          low24h: parseFloat((gold.low24h / 79.5).toFixed(3)),
          volume24h: Math.round(gold.volume24h / 10)
        };
      }
    }
  } catch (err) {
    console.error('Failed to fetch crypto prices from Binance:', err);
  }

  // 2. Fetch Forex Prices from ExchangeRate-API
  try {
    const exchangeRes = await fetch(
      'https://open.er-api.com/v6/latest/USD',
      { next: { revalidate: 0 } }
    );
    if (exchangeRes.ok) {
      const data = await exchangeRes.json();
      const rates = data?.rates;
      if (rates) {
        // EUR/USD
        const eurRate = 1 / rates.EUR;
        result['eur-PERP'] = {
          lastPrice: parseFloat(eurRate.toFixed(4)),
          change24h: 0.05,
          high24h: parseFloat((eurRate * 1.002).toFixed(4)),
          low24h: parseFloat((eurRate * 0.998).toFixed(4)),
          volume24h: 154020000
        };

        // GBP/USD
        const gbpRate = 1 / rates.GBP;
        result['gbp-PERP'] = {
          lastPrice: parseFloat(gbpRate.toFixed(4)),
          change24h: -0.12,
          high24h: parseFloat((gbpRate * 1.0025).toFixed(4)),
          low24h: parseFloat((gbpRate * 0.9975).toFixed(4)),
          volume24h: 98400000
        };

        // USD/JPY
        const jpyRate = rates.JPY;
        result['jpy-PERP'] = {
          lastPrice: parseFloat(jpyRate.toFixed(2)),
          change24h: 0.15,
          high24h: parseFloat((jpyRate * 1.003).toFixed(2)),
          low24h: parseFloat((jpyRate * 0.997).toFixed(2)),
          volume24h: 245080000
        };
      }
    }
  } catch (err) {
    console.error('Failed to fetch forex rates from er-api:', err);
  }

  return NextResponse.json(result);
}
