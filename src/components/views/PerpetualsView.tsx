'use client';

import React, { useState, useEffect } from 'react';
import { useAppState } from '@/context/useAppState';
import { Activity, Flame, TrendingUp, TrendingDown, Hourglass, HelpCircle, BarChart3, ListFilter, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface LiquidationEvent {
  id: string;
  time: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  value: number;
  size: number;
}

export default function PerpetualsView() {
  const { markets, setActiveTab, setActivePairBySymbol } = useAppState();

  const [countdown, setCountdown] = useState('03:45:12');
  const [liqFeed, setLiqFeed] = useState<LiquidationEvent[]>([]);

  // Simulate countdown ticking
  useEffect(() => {
    const timer = setInterval(() => {
      const date = new Date();
      const hours = 7 - (date.getHours() % 8);
      const minutes = 59 - date.getMinutes();
      const seconds = 59 - date.getSeconds();
      
      const format = (n: number) => n.toString().padStart(2, '0');
      setCountdown(`${format(hours)}:${format(minutes)}:${format(seconds)}`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Populate mock liquidation feed
  useEffect(() => {
    const generateInitialLiqs = () => {
      const list: LiquidationEvent[] = [];
      const symbols = ['BTC-PERP', 'ETH-PERP', 'SOL-PERP', 'ARC-PERP'];
      for (let i = 0; i < 6; i++) {
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        const side = Math.random() > 0.5 ? 'LONG' : 'SHORT';
        const price = symbol.startsWith('BTC') ? 67400 : symbol.startsWith('ETH') ? 3480 : symbol.startsWith('SOL') ? 145 : 1.25;
        const size = Number((Math.random() * (symbol.startsWith('BTC') ? 1.5 : 15)).toFixed(2));
        const value = Math.round(size * price);
        const date = new Date();
        date.setMinutes(date.getMinutes() - i * 15);

        list.push({
          id: `liq-${Math.random()}`,
          time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          symbol,
          side,
          size,
          value
        });
      }
      setLiqFeed(list);
    };

    generateInitialLiqs();

    // Stream new liquidations
    const interval = setInterval(() => {
      const symbols = ['BTC-PERP', 'ETH-PERP', 'SOL-PERP', 'ARC-PERP', 'SUI-PERP'];
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const side = Math.random() > 0.5 ? 'LONG' : 'SHORT';
      const price = symbol.startsWith('BTC') ? 67400 : symbol.startsWith('ETH') ? 3480 : symbol.startsWith('SOL') ? 145 : 1.25;
      const size = Number((Math.random() * (symbol.startsWith('BTC') ? 1.2 : 12)).toFixed(2));
      const value = Math.round(size * price);
      
      const newLiq: LiquidationEvent = {
        id: `liq-${Math.random()}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        symbol,
        side,
        size,
        value
      };

      setLiqFeed(prev => [newLiq, ...prev].slice(0, 10));
    }, 8500);

    return () => clearInterval(interval);
  }, []);

  // Aggregated Stats
  const totalVolume = markets.reduce((acc, m) => acc + m.volume24h, 0);
  const totalOI = markets.reduce((acc, m) => acc + m.openInterest, 0);
  const averageFunding = markets.reduce((acc, m) => acc + m.fundingRate, 0) / markets.length;

  // Sorted Lists
  const topMovers = [...markets].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h)).slice(0, 4);
  const trendingMarkets = [...markets].sort((a, b) => b.volume24h - a.volume24h).slice(0, 4);
  const recentlyListed = markets.filter(m => m.symbol.includes('ARC') || m.symbol.includes('SUI') || m.symbol.includes('APT'));

  const handleMoverClick = (symbol: string) => {
    setActivePairBySymbol(symbol);
    setActiveTab('Perpetuals');
  };

  return (
    <main className="w-full flex-1 max-w-[1600px] mx-auto p-4 lg:p-6 space-y-6 select-none">
      
      {/* 1. TOP STATS BAR */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: '24h Trading Volume', value: `$${totalVolume.toLocaleString()}`, change: '+14.2%', desc: 'Arc Testnet cumulative', isPositive: true },
          { label: 'Aggregate Open Interest', value: `$${totalOI.toLocaleString()}`, change: '+8.4%', desc: 'Active leveraged contracts', isPositive: true },
          { label: 'Funding Settled (Avg)', value: `${(averageFunding * 100).toFixed(4)}%`, desc: 'Next payment countdown', highlight: countdown, isClock: true },
          { label: 'Testnet liquidations (24h)', value: '$1,845,900', change: '-45.1%', desc: 'Active margin liquidations', isPositive: false }
        ].map((stat, i) => (
          <div key={i} className="bg-[#09090c] border border-[#13131a] rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden">
            <div className="text-xs text-[#8e8e9f] font-semibold">{stat.label}</div>
            
            <div className="my-2.5 flex items-baseline justify-between">
              <span className="text-lg font-bold text-white tracking-wide number-mono">{stat.value}</span>
              {stat.change && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  stat.isPositive ? 'bg-emerald-500/10 text-[#10b981]' : 'bg-red-500/10 text-[#ef4444]'
                }`}>
                  {stat.change}
                </span>
              )}
              {stat.isClock && (
                <span className="text-xs font-bold text-[#8b5cf6] flex items-center gap-1 bg-[#8b5cf6]/10 px-2 py-0.5 rounded number-mono">
                  <Hourglass size={12} className="animate-spin" />
                  {stat.highlight}
                </span>
              )}
            </div>
            
            <div className="text-[10px] text-[#6e6e7f] uppercase">{stat.desc}</div>
          </div>
        ))}
      </section>

      {/* 2. HEATMAP SECTION */}
      <section className="bg-[#09090c] border border-[#13131a] rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="text-[#8b5cf6]" size={18} />
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">Market Performance Heatmap</h2>
          </div>
          <span className="text-[10px] text-[#8e8e9f]">Box size corresponds to 24h trading volume</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 h-[240px]">
          {markets.map(m => {
            const isGainer = m.change24h >= 0;
            // Determine size weight based on volume rank
            const weight = m.volume24h > 5000000000 ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1';
            
            // Background intensity based on change magnitude
            const absChange = Math.abs(m.change24h);
            const intensity = Math.min(0.9, 0.15 + (absChange / 12) * 0.7);
            
            const background = isGainer
              ? `rgba(16, 185, 129, ${intensity})`
              : `rgba(239, 68, 68, ${intensity})`;

            return (
              <div
                key={m.symbol}
                onClick={() => handleMoverClick(m.symbol)}
                style={{ backgroundColor: background }}
                className={`rounded-lg p-3 flex flex-col justify-between cursor-pointer border border-[#ffffff]/10 hover:border-white hover:scale-[1.02] transition-all duration-200 relative group`}
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:underline">{m.symbol}</div>
                  <div className="text-[9px] text-white/70 uppercase">{m.name}</div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-bold text-white number-mono">
                    {m.lastPrice.toLocaleString(undefined, { minimumFractionDigits: m.symbol.startsWith('jpy') ? 5 : 2 })}
                  </div>
                  <div className="text-[10px] font-bold text-white/90 number-mono">
                    {isGainer ? '+' : ''}{m.change24h}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. THREE-COLUMN INFO CARDS */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMN 1: TOP MOVERS */}
        <div className="bg-[#09090c] border border-[#13131a] rounded-xl p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-3 border-b border-[#13131a] pb-3">
            <Flame className="text-amber-500" size={16} />
            <h3 className="text-xs font-bold text-white uppercase tracking-wide">Top Movers</h3>
          </div>
          <div className="space-y-2.5">
            {topMovers.map(m => {
              const isGainer = m.change24h >= 0;
              return (
                <div
                  key={m.symbol}
                  onClick={() => handleMoverClick(m.symbol)}
                  className="flex items-center justify-between p-2 bg-[#0d0d12] border border-[#13131a]/60 hover:border-[#8b5cf6]/40 rounded-lg cursor-pointer transition-colors"
                >
                  <div>
                    <span className="text-xs font-bold text-white block">{m.symbol}</span>
                    <span className="text-[9px] text-[#6e6e7f] uppercase">{m.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-white block number-mono">
                      ${m.lastPrice.toLocaleString(undefined, { minimumFractionDigits: m.symbol.startsWith('jpy') ? 4 : 2 })}
                    </span>
                    <span className={`text-[10px] font-bold number-mono flex items-center gap-0.5 justify-end ${
                      isGainer ? 'text-[#10b981]' : 'text-[#ef4444]'
                    }`}>
                      {isGainer ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {isGainer ? '+' : ''}{m.change24h}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: LIQUIDATION FEED */}
        <div className="bg-[#09090c] border border-[#13131a] rounded-xl p-4 shadow-lg flex flex-col h-[300px] overflow-hidden">
          <div className="flex items-center gap-2 mb-3 border-b border-[#13131a] pb-3">
            <AlertTriangle className="text-[#ef4444]" size={16} />
            <h3 className="text-xs font-bold text-white uppercase tracking-wide">Live Liquidation Feed</h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {liqFeed.map(liq => (
              <div
                key={liq.id}
                className="p-2.5 bg-[#ef4444]/5 border border-[#ef4444]/15 rounded-lg flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{liq.symbol}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      liq.side === 'LONG' ? 'bg-[#ef4444]/15 text-[#ef4444]' : 'bg-[#10b981]/15 text-[#10b981]'
                    }`}>
                      {liq.side === 'LONG' ? 'LIQ LONG' : 'LIQ SHORT'}
                    </span>
                  </div>
                  <span className="text-[9px] text-[#6e6e7f] number-mono">{liq.time}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-white block number-mono">${liq.value.toLocaleString()}</span>
                  <span className="text-[9px] text-[#8e8e9f] number-mono">Size: {liq.size}</span>
                </div>
              </div>
            ))}

            {liqFeed.length === 0 && (
              <div className="text-center text-xs text-[#6e6e7f] py-8">
                Monitoring live contract liquidation feeds...
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: FUNDING COUNTDOWNS */}
        <div className="bg-[#09090c] border border-[#13131a] rounded-xl p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-3 border-b border-[#13131a] pb-3">
            <Hourglass className="text-[#8b5cf6]" size={16} />
            <h3 className="text-xs font-bold text-white uppercase tracking-wide">Active Funding Rates</h3>
          </div>
          <div className="space-y-2 max-h-[235px] overflow-y-auto pr-1">
            {markets.slice(0, 6).map(m => {
              const isPositive = m.fundingRate >= 0;
              return (
                <div
                  key={m.symbol}
                  className="flex items-center justify-between p-2 bg-[#0d0d12] border border-[#13131a]/60 rounded-lg text-xs"
                >
                  <span className="font-bold text-white">{m.symbol}</span>
                  <div className="text-right">
                    <span className={`font-semibold number-mono ${isPositive ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                      {isPositive ? '+' : ''}{(m.fundingRate * 100).toFixed(4)}%
                    </span>
                    <span className="text-[9px] text-[#6e6e7f] block">every 8 hours</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </section>
    </main>
  );
}
