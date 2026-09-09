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
  'LIT-PERP': 'Binance:LITUSDT',
  
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
    
    // Clear container
    containerRef.current.innerHTML = '';

    const isIframeFallback = tvSymbol.startsWith('TVC:') || tvSymbol.startsWith('FX:');
    

    if (isIframeFallback) {
      // Use the standard Iframe Widget for Forex/Commodities
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.type = 'text/javascript';
      script.async = true;
      
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
        enable_publishing: false,
        support_host: 'https://www.tradingview.com'
      });
      containerRef.current.appendChild(script);
      return;
    }

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
        disabled_features: ['use_localstorage_for_settings', 'create_volume_indicator_by_default', 'header_symbol_search'],
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
