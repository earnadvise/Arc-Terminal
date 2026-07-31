'use client';

import { useEffect, useRef, memo } from 'react';

// Maps our internal pair symbols to TradingView symbols
const TV_SYMBOL_MAP: Record<string, string> = {
  'BTC-PERP':  'BINANCE:BTCUSDT',
  'ETH-PERP':  'BINANCE:ETHUSDT',
  'SOL-PERP':  'BINANCE:SOLUSDT',
  'SUI-PERP':  'BINANCE:SUIUSDT',
  'APT-PERP':  'BINANCE:APTUSDT',
  'ARC-PERP':  'BINANCE:BTCUSDT',  // no live pair yet — fallback to BTC
  'xau-PERP':  'TVC:GOLD',
  'xag-PERP':  'TVC:SILVER',
  'eur-PERP':  'FX:EURUSD',
  'gbp-PERP':  'FX:GBPUSD',
  'jpy-PERP':  'FX:USDJPY',
};

interface Props {
  symbol: string;
  timeframe?: string;
}

function TradingViewChart({ symbol, timeframe = '60' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Map timeframe string to TradingView interval
  const tvInterval = (() => {
    switch (timeframe) {
      case '1m':  return '1';
      case '5m':  return '5';
      case '15m': return '15';
      case '1h':  return '60';
      case '4h':  return '240';
      case '1D':  return 'D';
      default:    return '60';
    }
  })();

  const tvSymbol = TV_SYMBOL_MAP[symbol] ?? 'BINANCE:BTCUSDT';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear any previous widget
    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.textContent = JSON.stringify({
      autosize:          true,
      symbol:            tvSymbol,
      interval:          tvInterval,
      timezone:          'Etc/UTC',
      theme:             'light',
      style:             '1',
      locale:            'en',
      backgroundColor:   '#ffffff',
      gridColor:         'rgba(0,0,0,0.04)',
      hide_top_toolbar:  false,
      hide_legend:       false,
      hide_side_toolbar: false,
      allow_symbol_change: false,
      save_image:        true,
      calendar:          false,
      hide_volume:       false,
      support_host:      'https://www.tradingview.com',
    });

    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [tvSymbol, tvInterval]);

  return (
    <div
      className="tradingview-widget-container w-full h-full rounded-xl overflow-hidden"
      ref={containerRef}
      style={{ minHeight: 460 }}
    />
  );
}

export default memo(TradingViewChart);
