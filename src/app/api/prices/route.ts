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

  // Default fallback prices if all external APIs are unreachable
  const fallbacks: Record<string, PriceData> = {
    'BTC-PERP': { lastPrice: 65420.50, change24h: 1.85, high24h: 66200.00, low24h: 64100.00, volume24h: 2845012000 },
    'ETH-PERP': { lastPrice: 3480.20, change24h: -0.42, high24h: 3550.00, low24h: 3420.00, volume24h: 1420950000 },
    'SOL-PERP': { lastPrice: 145.80, change24h: 3.12, high24h: 149.50, low24h: 141.20, volume24h: 890400000 },
    'SUI-PERP': { lastPrice: 1.85, change24h: 4.50, high24h: 1.92, low24h: 1.76, volume24h: 310200000 },
    'APT-PERP': { lastPrice: 8.40, change24h: -1.15, high24h: 8.75, low24h: 8.20, volume24h: 185000000 },
    'xau-PERP': { lastPrice: 2410.50, change24h: 0.65, high24h: 2425.00, low24h: 2395.00, volume24h: 620000000 },
    'xag-PERP': { lastPrice: 28.50, change24h: 0.40, high24h: 28.90, low24h: 28.10, volume24h: 120000000 },
    'eur-PERP': { lastPrice: 1.0850, change24h: 0.05, high24h: 1.0880, low24h: 1.0820, volume24h: 154020000 },
    'gbp-PERP': { lastPrice: 1.2720, change24h: -0.12, high24h: 1.2760, low24h: 1.2680, volume24h: 98400000 },
    'jpy-PERP': { lastPrice: 157.40, change24h: 0.15, high24h: 158.10, low24h: 156.80, volume24h: 245080000 },
    'ARC-PERP': { lastPrice: 65420.50, change24h: 1.85, high24h: 66200.00, low24h: 64100.00, volume24h: 2845012000 },
  };

  // 1. Try Binance
  let binanceSuccess = false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const binanceRes = await fetch(
      'https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22,%22SUIUSDT%22,%22APTUSDT%22,%22PAXGUSDT%22%5D',
      { next: { revalidate: 0 }, signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (binanceRes.ok) {
      const data = await binanceRes.json();
      if (Array.isArray(data) && data.length > 0) {
        binanceSuccess = true;
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
      }
    }
  } catch (err) {
    console.warn('Binance fetch failed or timed out:', err);
  }

  // 2. Fallback to CoinGecko if Binance blocked/failed (common on US Vercel servers)
  if (!binanceSuccess) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const cgRes = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,sui,aptos,pax-gold&vs_currencies=usd&include_24hr_change=true',
        { next: { revalidate: 0 }, signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (cgRes.ok) {
        const cgData = await cgRes.json();
        const cgMap: Record<string, string> = {
          bitcoin: 'BTC-PERP',
          ethereum: 'ETH-PERP',
          solana: 'SOL-PERP',
          sui: 'SUI-PERP',
          aptos: 'APT-PERP',
          'pax-gold': 'xau-PERP'
        };

        Object.entries(cgMap).forEach(([cgId, symbol]) => {
          if (cgData[cgId]) {
            const price = cgData[cgId].usd;
            const change = cgData[cgId].usd_24h_change || 0;
            result[symbol] = {
              lastPrice: price,
              change24h: parseFloat(change.toFixed(2)),
              high24h: parseFloat((price * (1 + Math.abs(change) / 200)).toFixed(2)),
              low24h: parseFloat((price * (1 - Math.abs(change) / 200)).toFixed(2)),
              volume24h: Math.round(price * 15000)
            };
          }
        });
      }
    } catch (err) {
      console.warn('CoinGecko fallback failed:', err);
    }
  }

  // Populate ARC-PERP matching BTC-PERP
  if (result['BTC-PERP']) {
    result['ARC-PERP'] = { ...result['BTC-PERP'] };
  }

  // Calculate Silver if Gold is available
  if (result['xau-PERP']) {
    const gold = result['xau-PERP'];
    result['xag-PERP'] = {
      lastPrice: parseFloat((gold.lastPrice / 82.5).toFixed(3)),
      change24h: gold.change24h,
      high24h: parseFloat((gold.high24h / 82.5).toFixed(3)),
      low24h: parseFloat((gold.low24h / 82.5).toFixed(3)),
      volume24h: Math.round(gold.volume24h / 10)
    };
  }

  // 3. Fetch Forex Rates
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const exchangeRes = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 0 },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (exchangeRes.ok) {
      const data = await exchangeRes.json();
      const rates = data?.rates;
      if (rates) {
        if (rates.EUR) {
          const eurRate = 1 / rates.EUR;
          result['eur-PERP'] = {
            lastPrice: parseFloat(eurRate.toFixed(4)),
            change24h: 0.05,
            high24h: parseFloat((eurRate * 1.002).toFixed(4)),
            low24h: parseFloat((eurRate * 0.998).toFixed(4)),
            volume24h: 154020000
          };
        }
        if (rates.GBP) {
          const gbpRate = 1 / rates.GBP;
          result['gbp-PERP'] = {
            lastPrice: parseFloat(gbpRate.toFixed(4)),
            change24h: -0.12,
            high24h: parseFloat((gbpRate * 1.0025).toFixed(4)),
            low24h: parseFloat((gbpRate * 0.9975).toFixed(4)),
            volume24h: 98400000
          };
        }
        if (rates.JPY) {
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
    }
  } catch (err) {
    console.warn('Forex fetch failed:', err);
  }

  // Merge fallbacks for any missing symbol so no market is ever 0 or undefined
  Object.keys(fallbacks).forEach((sym) => {
    if (!result[sym] || !result[sym].lastPrice || isNaN(result[sym].lastPrice)) {
      result[sym] = fallbacks[sym];
    }
  });

  return NextResponse.json(result);
}
