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
      

      if (!window.TradingView) return;

      const widgetOptions = {
        symbol: tvSymbol,
        datafeed: Datafeed,
        interval: timeframe.replace('m', '').replace('h', '60').replace('D', '1D'),
        container: containerRef.current,
        library_path: '/charting_library/',
        locale: 'en',
        disabled_features: ['use_localstorage_for_settings', 'create_volume_indicator_by_default'],
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
    <div className={"w-full h-full relative"}>
      
      <div
        className="tradingview-widget-container w-full h-full rounded-xl overflow-hidden"
        ref={containerRef}
      />
    </div>
  );
}

export default memo(TradingViewChart);
