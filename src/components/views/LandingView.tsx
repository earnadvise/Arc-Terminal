'use client';

import React from 'react';
import { useAppState } from '@/context/useAppState';
import { 
  Sparkles, ShieldCheck, Zap, Landmark, ArrowRight, 
  ChevronRight, Wallet, Play
} from 'lucide-react';

export default function LandingView() {
  const { setActiveTab, connectWallet, walletConnected, balances, markets } = useAppState();
  
  const btcMarket = markets?.find(m => m.symbol.includes('BTC'));
  const btcPrice = btcMarket?.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '---';
  const btcChange = btcMarket?.change24h || 0;
  const isGainer = btcChange >= 0;

  const features = [
    {
      title: 'Agentic Perpetual Trading',
      description: 'Leverage the power of AI to analyze markets, execute complex orders, and automate your strategies with natural language prompts.',
      icon: <Sparkles size={24} className="text-[#01C38E]" />,
      badge: 'Advanced AI'
    },
    {
      title: '100x Leverage Pools',
      description: 'Trade BTC, ETH, and SOL with low fees, zero price impact, and up to 100x leverage backed by professional-grade liquidity providers.',
      icon: <Zap size={24} className="text-amber-400" />,
      badge: 'High Performance'
    },
    {
      title: 'Yield Vault Optimization',
      description: 'Deposit stablecoins directly into autocompounding yield pools utilizing optimized on-chain execution with up to 5% APY.',
      icon: <Landmark size={24} className="text-[#0052FF]" />,
      badge: 'Passive APY'
    },
    {
      title: 'Direct RPC Failover',
      description: 'Custom client architecture routes read-only calls directly through the Arc Testnet RPC, avoiding MetaMask read timeouts completely.',
      icon: <ShieldCheck size={24} className="text-emerald-400" />,
      badge: 'RPC Bypass'
    }
  ];

  // Dummy mini-candlestick data for visual styling
  const miniCandles = [
    { h: 30, w: 6, c: 'bg-emerald-500/20 border-emerald-500' },
    { h: 45, w: 6, c: 'bg-emerald-500/20 border-emerald-500' },
    { h: 35, w: 6, c: 'bg-red-500/20 border-red-500' },
    { h: 60, w: 6, c: 'bg-emerald-500/20 border-emerald-500' },
    { h: 50, w: 6, c: 'bg-red-500/20 border-red-500' },
    { h: 75, w: 6, c: 'bg-emerald-500/20 border-emerald-500' },
    { h: 90, w: 6, c: 'bg-emerald-500/20 border-emerald-500' }
  ];

  return (
    <div className="flex-1 bg-[#0f172a] relative overflow-hidden flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 select-none">
      
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#01C38E]/5 blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] rounded-full bg-[#0052FF]/5 blur-3xl -z-10 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/[0.02] blur-3xl -z-10 pointer-events-none" />

      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:24px_24px] -z-20" />

      <div className="max-w-[1280px] mx-auto w-full space-y-16">
        
        {/* HERO SECTION */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#01C38E]/10 border border-[#01C38E]/30 text-xs font-bold text-[#01C38E]">
              <Sparkles size={12} className="animate-spin-slow" />
              Agentic Perp DEX Live on Arc Testnet
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] uppercase">
              The Next Generation <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-[#01C38E] via-[#0A786A] to-[#0052FF] bg-clip-text text-transparent">
                Trading Interface
              </span>
            </h1>
            
            <p className="text-[#8e8e9f] text-sm sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed font-semibold">
              Execute leveraged orders, optimize yields, and deploy custom stablecoin vaults in a unified trading terminal designed for active traders and AI agents.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button
                onClick={() => setActiveTab('Perpetuals')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#0A786A] to-[#01C38E] hover:from-[#098b7c] hover:to-[#04dca0] text-white font-bold rounded-xl shadow-[0_0_20px_rgba(1,195,142,0.25)] hover:shadow-[0_0_30px_rgba(1,195,142,0.4)] transition-all cursor-pointer group"
              >
                Launch Terminal
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              {!walletConnected ? (
                <button
                  onClick={() => connectWallet('MetaMask')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-800/40 border border-slate-700 hover:border-slate-500 text-white font-bold rounded-xl transition-all cursor-pointer"
                >
                  <Wallet size={16} />
                  Connect Wallet
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('Portfolio')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-800/40 border border-[#01C38E]/30 text-[#01C38E] font-bold rounded-xl transition-all cursor-pointer"
                >
                  View My Portfolio
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Hero Visual Block */}
          <div className="lg:col-span-5 relative hidden lg:block">
            <div className="relative bg-[#111827]/60 border border-[#334155] rounded-3xl p-6 backdrop-blur-md shadow-2xl flex flex-col gap-6 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#01C38E]/10 rounded-full blur-2xl -z-10" />
              
              <div className="flex items-center justify-between border-b border-[#334155] pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#01C38E] animate-ping" />
                  <span className="text-xs font-bold text-white tracking-wider">BTC-PERP TICKER</span>
                </div>
                <span className="text-[10px] text-[#8e8e9f] font-bold">1m Realtime Feed</span>
              </div>
              
              {/* Mock mini candlestick visual */}
              <div className="h-28 flex items-end justify-between gap-1 border-b border-[#334155]/40 pb-2">
                {miniCandles.map((candle, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                    {/* Wick */}
                    <div className="w-0.5 h-full bg-slate-700 relative flex items-center justify-center">
                      {/* Body */}
                      <div className={`w-3 rounded-sm border ${candle.c} absolute`} style={{ height: `${candle.h}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick stats on visual panel */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center">
                  <div className="text-[10px] text-[#8e8e9f] font-semibold">BTC LAST PRICE</div>
                  <div className="text-lg font-black text-white number-mono mt-0.5">${btcPrice}</div>
                </div>
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center">
                  <div className="text-[10px] text-[#8e8e9f] font-semibold">24h CHANGE</div>
                  <div className={`text-lg font-black number-mono mt-0.5 ${isGainer ? 'text-[#01C38E]' : 'text-red-500'}`}>
                    {isGainer ? '+' : ''}{btcChange.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section className="space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">Premium Execution Suite</h2>
            <p className="text-xs text-[#8e8e9f] font-semibold">
              Everything you need to navigate derivatives trading on the Arc network safely and reliably.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, idx) => (
              <div 
                key={idx} 
                className="bg-[#111827]/60 border border-[#334155] hover:border-[#01C38E]/30 rounded-2xl p-5 backdrop-blur-md transition-all space-y-4 group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 px-3 py-1 bg-white/5 border-l border-b border-[#334155] rounded-bl-xl text-[9px] font-bold text-[#8e8e9f]">
                  {feature.badge}
                </div>
                
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl inline-block">
                  {feature.icon}
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-white uppercase group-hover:text-[#01C38E] transition-colors">{feature.title}</h3>
                  <p className="text-xs text-[#8e8e9f] leading-relaxed font-semibold">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CALL TO ACTION ACCENT BOX */}
        <section className="bg-gradient-to-tr from-[#0b1329] via-[#111827] to-[#1e293b] border border-[#334155] rounded-3xl p-8 relative overflow-hidden text-center space-y-6 shadow-2xl">
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#01C38E]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-[#0052FF]/5 rounded-full blur-3xl pointer-events-none" />
          
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider">
            Ready to trade with next-gen speed?
          </h2>
          <p className="text-xs sm:text-sm text-[#8e8e9f] max-w-lg mx-auto font-semibold">
            Connect your wallet, grab mock assets from the faucet, and execute your first swap or leverage order in seconds.
          </p>

          <div className="flex justify-center">
            <button
              onClick={() => setActiveTab('Perpetuals')}
              className="flex items-center gap-2 px-8 py-3.5 bg-white text-[#0f172a] hover:bg-slate-200 font-extrabold rounded-xl shadow-xl transition-all cursor-pointer group"
            >
              Enter Trading Terminal
              <Play size={14} className="fill-[#0f172a] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
