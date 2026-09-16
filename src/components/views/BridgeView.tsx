'use client';
import React, { useMemo } from 'react';
import { useAppState } from '@/context/useAppState';
import dynamic from 'next/dynamic';
import type { WidgetConfig } from '@lifi/widget';

// Lazy load the widget to prevent lagging and hydration issues
const LiFiWidget = dynamic(
  () => import('@lifi/widget').then((mod) => mod.LiFiWidget),
  { 
    ssr: false, 
    loading: () => <div className="h-[500px] w-full flex flex-col items-center justify-center animate-pulse bg-slate-50 dark:bg-[#1f1f2e]/50 rounded-[16px]">
      <div className="w-8 h-8 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin mb-4" />
      <div className="text-sm font-medium text-slate-500 dark:text-[#8a8a9e]">Loading Bridge...</div>
    </div> 
  }
);

export default function BridgeView() {
  const { isDarkMode } = useAppState();

  const widgetConfig = useMemo<WidgetConfig>(() => {
    return {
      integrator: 'ArcTerminal',
      appearance: isDarkMode ? 'dark' : 'light',
      containerStyle: {
        border: isDarkMode ? '1px solid #1f1f2e' : '1px solid rgb(234, 234, 234)',
        borderRadius: '16px',
        margin: '0 auto',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
      },
      theme: {
        palette: {
          primary: { main: '#3b82f6' },
          secondary: { main: '#8b5cf6' },
        },
        shape: {
          borderRadius: 16,
          borderRadiusSecondary: 16,
        },
      },
      chains: {
        allow: [5042, 1, 42161, 8453, 10, 137, 43114],
      },
      toChain: 5042,
    };
  }, [isDarkMode]);

  return (
    <main className="w-full flex-1 max-w-[1600px] mx-auto p-4 lg:p-6 flex items-center justify-center min-h-[calc(100vh-140px)] select-none animate-fadeIn">
      <div className="w-full max-w-[480px] space-y-4 my-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-wide">Bridge</h1>
            <p className="text-xs text-slate-500 dark:text-[#8a8a9e] mt-0.5">Powered by LI.FI</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#13131a] rounded-[24px] border border-slate-100 dark:border-[#1f1f2e] shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden min-h-[500px]">
          <LiFiWidget integrator="ArcTerminal" config={widgetConfig} />
        </div>
      </div>
    </main>
  );
}
