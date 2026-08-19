'use client';

import React from 'react';
import { useAppState } from '@/context/useAppState';
import { 
  Sparkles, ShieldCheck, Zap, Landmark, ArrowRight, 
  TrendingUp, Activity, Box
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingView() {
  const { setActiveTab, markets } = useAppState();
  
  const btcMarket = markets?.find(m => m.symbol.includes('BTC'));
  const btcPrice = btcMarket?.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '64,316.21';
  const btcChange = btcMarket?.change24h || 0.17;
  const isGainer = btcChange >= 0;

  const features = [
    {
      title: 'Agentic Trading',
      desc: 'Let Arc AI execute complex multi-step trades automatically via prompt.',
      icon: <Sparkles size={20} className="text-[#8b5cf6]" />
    },
    {
      title: '20x Leverage',
      desc: 'Trade with high leverage, zero price impact, and deep liquidity.',
      icon: <TrendingUp size={20} className="text-[#3b82f6]" />
    },
    {
      title: 'Auto-Compounding',
      desc: 'Deposit to Vaults and let agents optimize your APY on-chain.',
      icon: <Landmark size={20} className="text-[#10b981]" />
    }
  ];

  return (
    <div className="flex-1 bg-white dark:bg-[#09090c] relative overflow-hidden flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 select-none">
      
      {/* Decorative Orbs - Hidden in Light Mode for cleaner look, vibrant in Dark Mode */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#8b5cf6]/20 blur-[120px] rounded-full pointer-events-none hidden dark:block" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#3b82f6]/20 blur-[120px] rounded-full pointer-events-none hidden dark:block" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:64px_64px] -z-20 opacity-50" />

      <div className="max-w-[1280px] mx-auto w-full z-10">
        
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="lg:col-span-7 space-y-8 text-center lg:text-left"
          >
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] text-xs font-bold text-slate-700 dark:text-[#8a8a9e] shadow-sm"
            >
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
              </span>
              Arc Testnet Live
            </motion.div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.05]">
              Trade Smarter <br />
              With <span className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">Arc AI</span>
            </h1>
            
            <p className="text-slate-500 dark:text-[#8a8a9e] text-lg sm:text-xl max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Experience the next generation of perpetual trading. High leverage, instant execution, and autonomous AI agents working to optimize your portfolio 24/7.
            </p>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4"
            >
              <button
                onClick={() => setActiveTab('Swap')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 dark:bg-white hover:bg-slate-800 text-white dark:text-[#0c0c10] font-bold rounded-2xl shadow-xl transition-all cursor-pointer group"
              >
                Launch Terminal
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => setActiveTab('Agents')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] hover:border-[#8b5cf6]/50 text-slate-700 dark:text-white font-bold rounded-2xl shadow-sm transition-all cursor-pointer group"
              >
                <Sparkles size={18} className="text-[#8b5cf6]" />
                Explore AI Agents
              </button>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            className="lg:col-span-5 relative hidden lg:block perspective-1000"
          >
            {/* 3D Glassmorphism Card Effect */}
            <div className="relative bg-white/70 dark:bg-[#13131a]/80 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[32px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(139,92,246,0.15)] overflow-hidden transform rotate-y-[-5deg] rotate-x-[5deg]">
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    B
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">BTC/USD</h3>
                    <p className="text-xs text-slate-500 dark:text-[#8a8a9e] font-medium">Perpetual Futures</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-slate-900 dark:text-white number-mono">${btcPrice}</div>
                  <div className={`text-sm font-bold number-mono flex items-center justify-end gap-1 ${isGainer ? 'text-[#10b981]' : 'text-red-500'}`}>
                    {isGainer ? <TrendingUp size={14} /> : <Activity size={14} />}
                    {isGainer ? '+' : ''}{btcChange.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Chart Mockup */}
              <div className="h-40 w-full flex items-end justify-between gap-2 mb-8">
                {[40, 55, 45, 70, 65, 80, 95].map((h, i) => (
                  <motion.div 
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 0.5 + (i * 0.1), duration: 0.8, type: "spring" }}
                    className={`w-full rounded-t-sm ${i % 2 === 0 ? 'bg-gradient-to-t from-[#10b981]/20 to-[#10b981]' : 'bg-gradient-to-t from-[#3b82f6]/20 to-[#3b82f6]'}`}
                  />
                ))}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-[#0c0c10] p-4 rounded-2xl border border-slate-100 dark:border-[#1f1f2e]">
                  <p className="text-xs text-slate-500 dark:text-[#8a8a9e] mb-1">24h Volume</p>
                  <p className="font-bold text-slate-900 dark:text-white number-mono">$142.5M</p>
                </div>
                <div className="bg-slate-50 dark:bg-[#0c0c10] p-4 rounded-2xl border border-slate-100 dark:border-[#1f1f2e]">
                  <p className="text-xs text-slate-500 dark:text-[#8a8a9e] mb-1">Open Interest</p>
                  <p className="font-bold text-slate-900 dark:text-white number-mono">$84.2M</p>
                </div>
              </div>

              {/* Overlay Badge */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-4 top-20 bg-white dark:bg-[#1f1f2e] border border-slate-200 dark:border-white/10 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3"
              >
                <div className="bg-[#10b981]/10 p-2 rounded-full">
                  <Box size={16} className="text-[#10b981]" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 dark:text-[#8a8a9e] font-bold uppercase tracking-wider">Oracle Status</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Synced</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Features Row */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20"
        >
          {features.map((f, i) => (
            <div key={i} className="p-6 bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] rounded-3xl hover:border-[#8b5cf6]/40 transition-colors shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-[#0c0c10] border border-slate-100 dark:border-[#1f1f2e] flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{f.title}</h4>
              <p className="text-sm text-slate-500 dark:text-[#8a8a9e] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </motion.section>

      </div>
    </div>
  );
}
