'use client';

import React, { useState } from 'react';
import { useAppState } from '@/context/useAppState';
import { Wallet, Info, ArrowUpRight, TrendingUp, TrendingDown, ShieldAlert, Coins } from 'lucide-react';

export default function PortfolioView() {
  const {
    balances,
    positions,
    closePosition,
    walletConnected,
    depositFunds,
    withdrawFunds
  } = useAppState();

  const [activeChartTab, setActiveChartTab] = useState<'Equity' | 'Allocation'>('Equity');

  const eurcPrice = 1.085;
  const arcPrice  = 1.245;

  const assetDetails = [
    { name: 'USD Coin',   symbol: 'USDC', amount: balances.USDC, price: 1.0,       value: balances.USDC,            color: '#8b5cf6' },
    { name: 'Euro Coin',  symbol: 'EURC', amount: balances.EURC, price: eurcPrice, value: balances.EURC * eurcPrice, color: '#3b82f6' },
    { name: 'Tether USD', symbol: 'USDT', amount: balances.USDT, price: 1.0,       value: balances.USDT,            color: '#10b981' },
    { name: 'Arc Native', symbol: 'ARC',  amount: balances.ARC,  price: arcPrice,  value: balances.ARC * arcPrice,  color: '#ec4899' },
  ];

  const totalPositionsValue = positions.reduce((acc, pos) => acc + (pos.size * pos.markPrice), 0);
  const totalMarginLocked = positions.reduce((acc, pos) => acc + pos.margin, 0);
  const unrealizedPnL = positions.reduce((acc, pos) => acc + pos.unrealizedPnl, 0);
  const realizedPnL = 0.0;
  
  // Total balance = Collateral Value + Unrealized PnL
  const collateralValue = assetDetails.reduce((acc, asset) => acc + asset.value, 0);
  const totalBalance = collateralValue + unrealizedPnL;
  const availableMargin = collateralValue - totalMarginLocked;
  const marginUsagePercent = collateralValue > 0 ? (totalMarginLocked / collateralValue) * 100 : 0;

  // Mock Performance Curve coordinates (SVG grid mapping)
  const linePoints = [
    { day: 'Mon', value: 8400 },
    { day: 'Tue', value: 9100 },
    { day: 'Wed', value: 8900 },
    { day: 'Thu', value: 9600 },
    { day: 'Fri', value: 10400 },
    { day: 'Sat', value: 10200 },
    { day: 'Sun', value: totalBalance }
  ];

  const minVal = Math.min(...linePoints.map(p => p.value)) * 0.98;
  const maxVal = Math.max(...linePoints.map(p => p.value)) * 1.02;
  const diffVal = maxVal - minVal;

  // Generate SVG path coordinates
  const width = 600;
  const height = 180;
  const points = linePoints.map((p, index) => {
    const x = (index / (linePoints.length - 1)) * (width - 60) + 30;
    const y = height - ((p.value - minVal) / diffVal) * (height - 40) - 20;
    return { x, y, day: p.day, value: p.value };
  });

  const pathD = points.reduce((acc, p, index) => {
    return acc + `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y} `;
  }, '');

  // Fill gradient path
  const areaD = pathD + `L ${points[points.length - 1].x} ${height - 10} L ${points[0].x} ${height - 10} Z`;

  return (
    <main className="w-full flex-1 max-w-[1600px] mx-auto p-4 lg:p-6 space-y-6 select-none">
      
      {/* 1. PORTFOLIO METRICS CARDS */}
      <section className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Equity', value: `$${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, desc: 'USDC Collateral + PnL', isPrimary: true },
          { label: 'Available Margin', value: `$${availableMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, desc: 'Free for trading' },
          { label: 'Unrealized PnL', value: `${unrealizedPnL >= 0 ? '+' : ''}$${unrealizedPnL.toFixed(2)}`, desc: 'Active contracts PnL', isPnl: true, pnlVal: unrealizedPnL },
          { label: 'Realized PnL', value: `+$${realizedPnL.toLocaleString()}`, desc: 'Settled historical PnL', isPnl: true, pnlVal: realizedPnL },
          { label: 'Open Positions', value: `${positions.length} Active`, desc: `${positions.length} markets traded` },
          { label: "Today's Return", value: '+2.85%', desc: '+$245.90 Profit', isPnl: true, pnlVal: 245.90 }
        ].map((card, i) => (
          <div
            key={i}
            className={`bg-[#09090c] border rounded-xl p-4 flex flex-col justify-between shadow-md relative overflow-hidden ${
              card.isPrimary 
                ? 'border-[#8b5cf6]/50 bg-gradient-to-tr from-[#3b82f6]/5 to-[#8b5cf6]/5' 
                : 'border-[#13131a]'
            }`}
          >
            {card.isPrimary && (
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-[#8b5cf6] to-[#3b82f6] opacity-10 rounded-bl-full" />
            )}
            
            <div className="text-[10px] font-bold text-[#8e8e9f] uppercase tracking-wide flex items-center gap-1.5">
              {card.label}
              <Info size={11} className="text-[#6e6e7f] cursor-help" />
            </div>

            <div className="my-2.5">
              <span className={`text-base lg:text-lg font-bold tracking-wide number-mono ${
                card.isPnl 
                  ? card.pnlVal >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'
                  : 'text-white'
              }`}>
                {card.value}
              </span>
            </div>

            <div className="text-[9px] text-[#6e6e7f] uppercase">{card.desc}</div>
          </div>
        ))}
      </section>

      {/* 2. CHARTS & MARGIN UTILIZATION SPLIT */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Equity performance / allocation chart */}
        <div className="xl:col-span-2 bg-[#09090c] border border-[#13131a] rounded-xl p-5 shadow-xl flex flex-col h-[340px]">
          <div className="flex items-center justify-between border-b border-[#13131a] pb-3 mb-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wide">Performance Portfolio</h3>
            
            <div className="flex bg-[#0d0d12] border border-[#13131a] p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setActiveChartTab('Equity')}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  activeChartTab === 'Equity'
                    ? 'bg-[#181822] text-[#8b5cf6] border border-[#8b5cf6]/20'
                    : 'text-[#8e8e9f] hover:text-white'
                }`}
              >
                Equity Growth
              </button>
              <button
                onClick={() => setActiveChartTab('Allocation')}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  activeChartTab === 'Allocation'
                    ? 'bg-[#181822] text-[#8b5cf6] border border-[#8b5cf6]/20'
                    : 'text-[#8e8e9f] hover:text-white'
                }`}
              >
                Asset Allocation
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            {activeChartTab === 'Equity' ? (
              <div className="w-full h-full flex flex-col justify-between">
                {/* SVG Line Graph */}
                <div className="flex-1 w-full relative">
                  <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                    <defs>
                      <linearGradient id="equityGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Guideline */}
                    <line x1="30" y1={height - 20} x2={width - 30} y2={height - 20} stroke="#13131a" strokeWidth="1" />
                    <line x1="30" y1={height / 2} x2={width - 30} y2={height / 2} stroke="#13131a" strokeWidth="1" strokeDasharray="4 4" />

                    {/* Gradient Area */}
                    <path d={areaD} fill="url(#equityGlow)" />

                    {/* Sparkline Curve */}
                    <path d={pathD} fill="none" stroke="url(#lineGradient)" strokeWidth="2.5" />
                    
                    {/* Linear Gradient for path */}
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>

                    {/* Coordinates Circles */}
                    {points.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="3" fill="#09090c" stroke="#8b5cf6" strokeWidth="1.5" />
                        <text x={p.x} y={height - 5} fill="#6e6e7f" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle">
                          {p.day}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
                <div className="text-[10px] text-[#6e6e7f] text-center italic">
                  * 7-day performance analytics
                </div>
              </div>
            ) : (
              <div className="flex w-full items-center justify-around gap-6">
                {/* Visual horizontal stacked bars */}
                <div className="w-[45%] flex flex-col gap-3">
                  {assetDetails.map(asset => {
                    const share = totalBalance > 0 ? (asset.value / totalBalance) * 100 : 0;
                    return (
                      <div key={asset.symbol} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-white">{asset.name}</span>
                          <span className="number-mono text-[#8e8e9f]">{share.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#13131a] rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full" 
                            style={{ width: `${share}%`, backgroundColor: asset.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* SVG Pie Representation */}
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Simplified segments using stroke-dasharray */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#13131a" strokeWidth="10" />
                    {/* USDC segment (represents ~50%) */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#8b5cf6" strokeWidth="10" strokeDasharray="125 251" strokeDashoffset="0" />
                    {/* BTC segment (represents ~30%) */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f59e0b" strokeWidth="10" strokeDasharray="75 251" strokeDashoffset="-125" />
                    {/* ETH segment (represents ~20%) */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="10" strokeDasharray="51 251" strokeDashoffset="-200" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#09090c] rounded-full m-4 border border-[#13131a]">
                    <span className="text-[10px] text-[#8e8e9f] font-bold uppercase tracking-widest">Assets</span>
                    <span className="text-xs font-bold text-white number-mono">4 Tokens</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Margin Usage Indicator */}
        <div className="bg-[#09090c] border border-[#13131a] rounded-xl p-5 shadow-xl flex flex-col justify-between h-[340px]">
          <div>
            <div className="flex justify-between items-center border-b border-[#13131a] pb-3 mb-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wide">Margin locked</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                marginUsagePercent > 80 ? 'bg-red-500/10 text-[#ef4444]' : 'bg-emerald-500/10 text-[#10b981]'
              }`}>
                {marginUsagePercent.toFixed(1)}% Used
              </span>
            </div>

            {/* Progress Meter */}
            <div className="space-y-2 mb-6">
              <div className="w-full h-3 bg-[#13131a] rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full bg-gradient-to-r transition-all duration-300 ${
                    marginUsagePercent > 80 
                      ? 'from-amber-500 to-[#ef4444]' 
                      : 'from-[#3b82f6] to-[#8b5cf6]'
                  }`}
                  style={{ width: `${marginUsagePercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#6e6e7f] font-bold uppercase">
                <span>Safe</span>
                <span>Warning (80%)</span>
                <span>Liquidation</span>
              </div>
            </div>

            {/* Summary Details */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8e8e9f]">Total Collateral Value</span>
                <span className="number-mono text-white">${collateralValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e8e9f]">Active Margin locked</span>
                <span className="number-mono text-white">${totalMarginLocked.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e8e9f]">Unrealized PnL Buffer</span>
                <span className={`number-mono font-bold ${unrealizedPnL >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  ${unrealizedPnL.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 items-start p-3 bg-amber-500/5 border border-amber-500/15 rounded-lg mt-4">
            <ShieldAlert size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#8e8e9f] leading-normal">
              On Arc Testnet, if margin usage exceeds 100%, your open positions will be closed via liquidation. Claim Faucet tokens to refill margin.
            </p>
          </div>
        </div>

      </section>

      {/* 3. COLLATERAL ASSETS & ACTIVE POSITIONS TABLES */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* COLLATERAL ASSETS TABLE */}
        <div className="xl:col-span-1 bg-[#09090c] border border-[#13131a] rounded-xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4 border-b border-[#13131a] pb-3">
            <Coins size={16} className="text-[#8b5cf6]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wide">Margin Collateral</h3>
          </div>

          <div className="space-y-3">
            {assetDetails.map(asset => (
              <div key={asset.symbol} className="p-2.5 bg-[#0d0d12] border border-[#13131a]/60 rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">{asset.symbol}</span>
                    <span className="text-[9px] text-[#6e6e7f] uppercase">{asset.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-white block number-mono">
                      {asset.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </span>
                    <span className="text-[10px] text-[#8e8e9f] number-mono block">
                      ${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {asset.symbol === 'USDC' && walletConnected && (
                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-[#13131a]/40">
                    <div className="flex justify-between text-[9px] text-[#6e6e7f] uppercase">
                      <span>Wallet Balance:</span>
                      <span className="number-mono font-semibold text-white">
                        ${balances.walletUSDC.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          const amt = prompt('Enter USDC amount to deposit into vault:');
                          if (amt) {
                            const parsed = parseFloat(amt);
                            if (parsed > 0) await depositFunds(parsed);
                          }
                        }}
                        className="flex-1 py-1 rounded bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 hover:bg-[#8b5cf6]/35 text-[#8b5cf6] text-[10px] font-bold transition-all cursor-pointer text-center"
                      >
                        Deposit
                      </button>
                      <button
                        onClick={async () => {
                          const amt = prompt('Enter USDC amount to withdraw from vault:');
                          if (amt) {
                            const parsed = parseFloat(amt);
                            if (parsed > 0) await withdrawFunds(parsed);
                          }
                        }}
                        className="flex-1 py-1 rounded bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-[#ef4444] text-[10px] font-bold transition-all cursor-pointer text-center"
                      >
                        Withdraw
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ACTIVE POSITIONS TABLE */}
        <div className="xl:col-span-2 bg-[#09090c] border border-[#13131a] rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-[#13131a] pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wide">Active Leverage Contracts</h3>
            <span className="text-[10px] text-[#8e8e9f]">{positions.length} Open Positions</span>
          </div>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[#6e6e7f] border-b border-[#13131a] pb-2 font-bold uppercase text-[10px]">
                <th className="py-2">Symbol</th>
                <th>Side</th>
                <th>Lev</th>
                <th>Entry</th>
                <th>Mark</th>
                <th>Margin</th>
                <th>Unrealized PnL</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#13131a]">
              {positions.map(pos => {
                const isGainer = pos.unrealizedPnl >= 0;
                return (
                  <tr key={pos.id} className="hover:bg-[#13131a]/30">
                    <td className="py-3 font-bold text-white">{pos.symbol}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        pos.side === 'LONG' ? 'bg-[#10b981]/15 text-[#10b981]' : 'bg-[#ef4444]/15 text-[#ef4444]'
                      }`}>
                        {pos.side}
                      </span>
                    </td>
                    <td className="number-mono text-[#c7c7d6]">{pos.leverage}x</td>
                    <td className="number-mono text-[#c7c7d6]">${pos.entryPrice.toLocaleString()}</td>
                    <td className="number-mono text-[#c7c7d6]">${pos.markPrice.toLocaleString()}</td>
                    <td className="number-mono text-[#c7c7d6]">${pos.margin.toFixed(2)}</td>
                    <td className={`number-mono font-bold ${isGainer ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                      ${pos.unrealizedPnl.toFixed(2)}
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => closePosition(pos.id)}
                        className="px-2 py-1 text-[10px] font-semibold text-[#ef4444] hover:bg-[#ef4444]/10 border border-[#ef4444]/20 hover:border-[#ef4444] rounded transition-colors"
                      >
                        Market Close
                      </button>
                    </td>
                  </tr>
                );
              })}

              {positions.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-[#6e6e7f] py-12">
                    No active positions found. Navigate to the Markets workspace to open a position.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </section>

    </main>
  );
}
