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

import { WagmiProvider, createConfig, http, useConnect, useDisconnect, useAccount } from 'wagmi';
import { mainnet, arbitrum, optimism, base, polygon, avalanche } from 'wagmi/chains';
import { injected, metaMask, safe } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

const arcMainnet = {
  id: 5042,
  name: 'Arc Mainnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.arc.io'] } },
  blockExplorers: { default: { name: 'ArcScan', url: 'https://arcscan.io' } },
} as any;

const queryClient = new QueryClient();

// Create config outside but don't export it yet, we will recreate it in a state
const getWagmiConfig = () => createConfig({
  chains: [arcMainnet, mainnet, arbitrum, optimism, base, polygon, avalanche],
  connectors: typeof window !== 'undefined' ? [
    injected({ target: 'rabby' }),
    injected({ target: 'metaMask' }),
    injected(),
  ] : [],
  transports: {
    [arcMainnet.id]: http(),
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
    [polygon.id]: http(),
    [avalanche.id]: http(),
  },
});

function WalletSync() {
  const { walletConnected } = useAppState();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { isConnected } = useAccount();

  const hasAttemptedConnect = React.useRef(false);

  useEffect(() => {
    if (walletConnected && !isConnected && connectors.length > 0 && !hasAttemptedConnect.current) {
      hasAttemptedConnect.current = true;
      const rabby = connectors.find(c => c.id.toLowerCase().includes('rabby'));
      const metaMask = connectors.find(c => c.id.toLowerCase().includes('metamask'));
      const injected = connectors.find(c => c.id === 'injected' || c.type === 'injected');
      const targetConnector = rabby || metaMask || injected || connectors[0];
      
      console.log('WalletSync connecting with:', targetConnector);
      connect({ connector: targetConnector });
    } else if (!walletConnected && isConnected) {
      hasAttemptedConnect.current = false;
      disconnect();
    }
  }, [walletConnected, isConnected, connectors, connect, disconnect]);

  return null;
}

export default function BridgeView() {
  const { isDarkMode, walletConnected, connectWallet } = useAppState();

  const widgetConfig = useMemo<WidgetConfig>(() => {
    return {
      integrator: 'ArcTerminal',
      appearance: isDarkMode ? 'dark' : 'light',
      hiddenUI: ['walletMenu'] as any, // Hides the top right wallet button on the widget
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

  const [config] = useState(() => getWagmiConfig());

  return (
    <main className="w-full flex-1 max-w-[1600px] mx-auto p-4 lg:p-6 flex items-center justify-center min-h-[calc(100vh-140px)] select-none animate-fadeIn">
      <div className="w-full max-w-[480px] space-y-4 my-auto relative">
        {/* If the main app wallet isn't connected, we can render an overlay here instead of showing the widget's connect button */}
        {!walletConnected && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-[#13131a]/80 backdrop-blur-sm rounded-[24px]">
            <button
              onClick={connectWallet}
              className="px-6 py-3 rounded-[12px] bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg shadow-blue-500/25"
            >
              Connect Wallet to Bridge
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-wide">Bridge</h1>
            <p className="text-xs text-slate-500 dark:text-[#8a8a9e] mt-0.5">Powered by LI.FI</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#13131a] rounded-[24px] border border-slate-100 dark:border-[#1f1f2e] shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden min-h-[500px]">
          <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
              <WalletSync />
              <LiFiWidget integrator="ArcTerminal" config={widgetConfig} />
            </QueryClientProvider>
          </WagmiProvider>
        </div>
      </div>
    </main>
  );
}
