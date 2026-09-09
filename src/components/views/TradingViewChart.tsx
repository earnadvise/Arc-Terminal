'use client';

import { useEffect, useRef, memo, useState } from 'react';
import { useAppState } from '@/context/useAppState';
import Datafeed from './datafeed';

// Maps our internal pair symbols to TradingView symbols
const TV_SYMBOL_MAP: Record<string, string> = {
  'BTC-PERP':  'Binance:BTCUSDT',
  'ETH-PERP':  'Binance:ETHUSDT',
  'SOL-PERP':  'Binance:SOLUSDT',
  'SUI-PERP':  'Binance:SUIUSDT',
  'APT-PERP':  'Binance:APTUSDT',
  'ARC-PERP':  'Binance:BTCUSDT',
  'xau-PERP':  'TVC:GOLD',
  'xag-PERP':  'TVC:SILVER',
  'eur-PERP':  'FX:EURUSD',
  'gbp-PERP':  'FX:GBPUSD',
  'jpy-PERP':  'FX:USDJPY',
  'HYPE-PERP': 'Hyperliquid:HYPE',
  'ASTER-PERP':'Binance:ASTRUSDT',
  'LIT-PERP':  'Mock:LITER',
};

interface Props {
  symbol: string;
  timeframe?: string;
}

declare global {
  interface Window {
    TradingView: any;
    Datafeeds: any;
  }
}

function TradingViewChart({ symbol, timeframe = '60' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { isDarkMode } = useAppState();
  const tvWidgetRef = useRef<any>(null);

  const tvSymbol = TV_SYMBOL_MAP[symbol] ?? 'Binance:BTCUSDT';

  useEffect(() => {
    if (!containerRef.current) return;

    // We dynamically load the scripts if they aren't loaded yet
    const loadScript = (src: string) => {
      return new Promise((resolve) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve(true);
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(true);
        document.head.appendChild(script);
      });
    };

    const initWidget = async () => {
      await loadScript('/charting_library/charting_library.standalone.js');
      

      if (!window.TradingView || !window.Datafeeds) return;

      const widgetOptions = {
        symbol: tvSymbol,
        datafeed: Datafeed,
        interval: timeframe.replace('m', '').replace('h', '60').replace('D', '1D'),
        container: containerRef.current,
        library_path: '/charting_library/',
        locale: 'en',
        disabled_features: ['use_localstorage_for_settings'],
        enabled_features: ['study_templates'],
        charts_storage_url: 'https://saveload.tradingview.com',
        charts_storage_api_version: '1.1',
        client_id: 'tradingview.com',
        user_id: 'public_user_id',
        fullscreen: false,
        autosize: true,
        theme: isDarkMode ? 'Dark' : 'Light',
        overrides: {
          'paneProperties.background': isDarkMode ? '#13131a' : '#ffffff',
          'paneProperties.backgroundType': 'solid',
        }
      };

      const widget = new window.TradingView.widget(widgetOptions);
      tvWidgetRef.current = widget;
    };

    initWidget();

    return () => {
      if (tvWidgetRef.current !== null) {
        tvWidgetRef.current.remove();
        tvWidgetRef.current = null;
      }
    };
  }, [tvSymbol, timeframe, isDarkMode]);

  return (
    <div className={isFullscreen ? "fixed inset-0 z-[100] bg-white dark:bg-[#13131a] p-4 flex flex-col" : "w-full h-full relative"}>
      <button 
        onClick={() => setIsFullscreen(!isFullscreen)}
        className="absolute top-2 right-2 z-10 bg-white dark:bg-[#13131a] hover:bg-slate-100 dark:hover:bg-[#1f1f2e] dark:bg-[#1f1f2e] text-slate-700 dark:text-slate-200 p-2 rounded-lg shadow-lg border border-slate-200 dark:border-[#1f1f2e] transition-colors"
        title={isFullscreen ? "Exit Fullscreen" : "Maximize Chart"}
      >
        {isFullscreen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
        )}
      </button>
      <div
        className="tradingview-widget-container w-full h-full rounded-xl overflow-hidden"
        ref={containerRef}
      />
    </div>
  );
}

export default memo(TradingViewChart);
