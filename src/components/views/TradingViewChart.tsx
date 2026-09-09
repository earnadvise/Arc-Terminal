'use client';

import { useEffect, useRef, memo } from 'react';
import { useAppState } from '@/context/useAppState';

// Maps our internal pair symbols to TradingView symbols
const TV_SYMBOL_MAP: Record<string, string> = {
  'BTC-PERP':  'Binance:BTCUSDT',
  'ETH-PERP':  'Binance:ETHUSDT',
  'SOL-PERP':  'Binance:SOLUSDT',
  'SUI-PERP':  'Binance:SUIUSDT',
  'APT-PERP':  'Binance:APTUSDT',
  'ARC-PERP':  'Binance:BTCUSDT', // Fallback
  'xau-PERP':  'TVC:GOLD',
  'xag-PERP':  'TVC:SILVER',
  'eur-PERP':  'FX:EURUSD',
  'gbp-PERP':  'FX:GBPUSD',
  'jpy-PERP':  'FX:USDJPY',
  'HYPE-PERP': 'Hyperliquid:HYPE',
  'ASTER-PERP':'Binance:ASTRUSDT',
};

interface Props {
  symbol: string;
  timeframe?: string;
}

function TradingViewChart({ symbol, timeframe = '60' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isDarkMode } = useAppState();

  const tvSymbol = TV_SYMBOL_MAP[symbol] ?? 'Binance:BTCUSDT';

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;

    // Convert internal timeframe to TradingView timeframe format
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

    script.textContent = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: tvInterval,
      timezone: 'Etc/UTC',
      theme: isDarkMode ? 'dark' : 'light',
      style: '1',
      locale: 'en',
      backgroundColor: isDarkMode ? '#13131a' : '#ffffff',
      gridColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
      hide_top_toolbar: false,
      hide_legend: false,
      hide_side_toolbar: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      hide_volume: true,
      support_host: 'https://www.tradingview.com'
    });

    containerRef.current.appendChild(script);
  }, [tvSymbol, timeframe, isDarkMode]);

  return (
    <div className="w-full h-full relative group">
      <div
        className="tradingview-widget-container w-full h-full rounded-xl overflow-hidden"
        ref={containerRef}
      />
    </div>
  );
}

export default memo(TradingViewChart);
