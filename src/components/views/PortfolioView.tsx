'use client';

import React from 'react';
import { useAppState } from '@/context/useAppState';
import { Wallet, Info, Coins, ShieldAlert, Activity } from 'lucide-react';

export default function PortfolioView() {
  const {
    balances,
    positions,
    closePosition,
    walletConnected
  } = useAppState();

  const eurcPrice = 1.085;
  const arcPrice  = 1.245;

  const assetDetails = [
    { name: 'USD Coin',   symbol: 'USDC', amount: balances.USDC, price: 1.0,       value: balances.USDC,            color: '#8b5cf6' },
    { name: 'Euro Coin',  symbol: 'EURC', amount: balances.EURC, price: eurcPrice, value: balances.EURC * eurcPrice, color: '#3b82f6' },
    { name: 'Tether USD', symbol: 'USDT', amount: balances.USDT, price: 1.0,       value: balances.USDT,            color: '#10b981' },
    { name: 'Arc Native', symbol: 'ARC',  amount: balances.ARC,  price: arcPrice,  value: balances.ARC * arcPrice,  color: '#ec4899' },
  ];

  const totalMarginLocked = positions.reduce((acc, pos) => acc + pos.margin, 0);
  const unrealizedPnL = positions.reduce((acc, pos) => acc + pos.unrealizedPnl, 0);
  
  // Total equity = Collateral Value + Unrealized PnL
  const collateralValue = assetDetails.reduce((acc, asset) => acc + asset.value, 0);
  const totalBalance = collateralValue + unrealizedPnL;
  const availableMargin = Math.max(0, collateralValue - totalMarginLocked);
  const marginUsagePercent = collateralValue > 0 ? Math.min(100, (totalMarginLocked / collateralValue) * 100) : 0;

  return (
    <main className="w-full flex-1 max-w-[1600px] mx-auto p-4 lg:p-6 space-y-6 select-none animate-fadeIn">
      
      {/* 1. PORTFOLIO METRICS CARDS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Equity',
            value: `$${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            desc: 'Wallet Collateral + Active PnL',
            isPrimary: true
          },
          {
            label: 'Available Margin',
            value: `$${availableMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            desc: 'Free for trading & positions'
          },
          {
            label: 'Unrealized PnL',
            value: `${unrealizedPnL >= 0 ? '+' : ''}$${unrealizedPnL.toFixed(2)}`,
            desc: 'Active contracts PnL',
            isPnl: true,
            pnlVal: unrealizedPnL
          },
          {
            label: 'Active Positions',
            value: `${positions.length}`,
            desc: `${positions.length} active market contracts`
          }
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
            </div>

            <div className="my-2.5">
              <span className={`text-lg lg:text-xl font-black tracking-wide number-mono ${
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

      {/* 2. ASSET ALLOCATION & MARGIN UTILIZATION SPLIT */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Asset Allocation Breakdown */}
        <div className="xl:col-span-2 bg-[#09090c] border border-[#13131a] rounded-xl p-5 shadow-xl flex flex-col justify-between h-[300px]">
          <div className="flex items-center justify-between border-b border-[#13131a] pb-3 mb-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
              <Coins size={14} className="text-[#8b5cf6]" />
              Portfolio Asset Allocation
            </h3>
            <span className="text-[10px] text-[#8e8e9f] number-mono font-semibold">
              Total: ${collateralValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-around">
            <div className="space-y-3">
              {assetDetails.map(asset => {
                const share = collateralValue > 0 ? (asset.value / collateralValue) * 100 : 0;
                return (
                  <div key={asset.symbol} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: asset.color }} />
                        {asset.name} ({asset.symbol})
                      </span>
                      <span className="number-mono text-[#8e8e9f]">
                        {asset.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {asset.symbol} ({share.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#13131a] rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.max(share, 0)}%`, backgroundColor: asset.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel: Margin Usage Meter */}
        <div className="bg-[#09090c] border border-[#13131a] rounded-xl p-5 shadow-xl flex flex-col justify-between h-[300px]">
          <div>
            <div className="flex justify-between items-center border-b border-[#13131a] pb-3 mb-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <ShieldAlert size={14} className="text-[#8b5cf6]" />
                Margin Health & Usage
              </h3>
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
                <span className="text-[#8e8e9f]">Active Margin Locked</span>
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
        </div>

      </section>

      {/* 3. COLLATERAL BALANCES & ACTIVE POSITIONS */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* COLLATERAL ASSETS TABLE */}
        <div className="xl:col-span-1 bg-[#09090c] border border-[#13131a] rounded-xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4 border-b border-[#13131a] pb-3">
            <Wallet size={16} className="text-[#8b5cf6]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wide">Wallet Balances</h3>
          </div>

          <div className="space-y-3">
            {assetDetails.map(asset => (
              <div key={asset.symbol} className="p-3 bg-[#0d0d12] border border-[#13131a]/60 rounded-xl flex items-center justify-between">
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
            ))}
          </div>
        </div>

        {/* ACTIVE POSITIONS TABLE */}
        <div className="xl:col-span-2 bg-[#09090c] border border-[#13131a] rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-[#13131a] pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
              <Activity size={14} className="text-[#8b5cf6]" />
              Active Positions
            </h3>
            <span className="text-[10px] text-[#8e8e9f]">{positions.length} Open Position{positions.length !== 1 ? 's' : ''}</span>
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
                        className="px-2.5 py-1 text-[10px] font-bold text-[#ef4444] hover:bg-[#ef4444]/10 border border-[#ef4444]/20 hover:border-[#ef4444] rounded transition-colors"
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
                    No active positions. Open trades in Perpetuals to view live position metrics.
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
