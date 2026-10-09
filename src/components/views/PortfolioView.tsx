'use client';

import React from 'react';
import { useAppState } from '@/context/useAppState';
import { useUnifiedBalance } from '@/lib/circle-unified-balance-kit';
import { useHyperliquid } from '@/lib/hyperliquid-kit';
import { Wallet, Info, Coins, ShieldAlert, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function PortfolioView() {
  const {
    balances,
    positions,
    closePosition,
    walletConnected
  } = useAppState();

  const { balances: unifiedBalances, crossChainDetails } = useUnifiedBalance();

  const [earnPositions, setEarnPositions] = React.useState<any[]>([]);

  React.useEffect(() => {
    let active = true;
    const fetchEarn = async () => {
      if (!walletConnected || typeof window === 'undefined' || !(window as any).ethereum) return;
      try {
        const { AppKit } = await import('@circle-fin/app-kit');
        const { createEthersAdapterFromProvider } = await import('@circle-fin/adapter-ethers-v6');
        const kit = new AppKit();
        const adapter = await createEthersAdapterFromProvider({ provider: (window as any).ethereum });
        const { vaults } = await kit.earn.exploreVaults({ chain: "Arc" });
        if (!active) return;
        
        const posPromises = (vaults || []).map(async (v: any) => {
          try {
            const pos = await kit.earn.getPosition({
              from: { adapter, chain: "Arc" },
              vaultAddress: v.vaultAddress
            });
            if (pos) {
              pos.mappedAsset = v.asset;
            }
            return pos;
          } catch (err) {
            return null;
          }
        });
        
        const results = await Promise.all(posPromises);
        if (active) setEarnPositions(results.filter(r => r !== null && Number(r.currentBalance) > 0));
      } catch (e) {
        console.error("Failed to fetch Earn positions for portfolio", e);
      }
    };
    fetchEarn();
    return () => { active = false; };
  }, [walletConnected]);

  const eurcPrice = 1.085;
  const arcPrice  = 1.245;

  const unifiedAssets = (crossChainDetails || []).map(detail => ({
    name: `USDC (${detail.chain})`,
    symbol: 'USDC',
    amount: detail.amount,
    price: 1.0,
    value: detail.amount,
    color: '#f59e0b'
  }));

  const assetDetails = [
    { name: 'USD Coin (Arc)', symbol: 'USDC', amount: balances.USDC, price: 1.0, value: balances.USDC, color: '#8b5cf6' },
    ...unifiedAssets,
    { name: 'Euro Coin',  symbol: 'EURC', amount: balances.EURC, price: eurcPrice, value: balances.EURC * eurcPrice, color: '#3b82f6' },
    { name: 'Tether USD', symbol: 'USDT', amount: balances.USDT, price: 1.0,       value: balances.USDT,            color: '#10b981' },
  ];

  const totalMarginLocked = positions.reduce((acc, pos) => acc + pos.margin, 0);
  const unrealizedPnL = positions.reduce((acc, pos) => acc + pos.unrealizedPnl, 0);
  
  const totalEarnBalance = earnPositions.reduce((acc, p) => acc + Number(p.currentBalance || 0) * (p.mappedAsset === 'EURC' || p.asset === 'EURC' ? eurcPrice : 1.0), 0);
  const totalEarnYield = earnPositions.reduce((acc, p) => acc + Number(p.pnl?.totalYieldEarned || 0) * (p.mappedAsset === 'EURC' || p.asset === 'EURC' ? eurcPrice : 1.0), 0);

  // Total equity = Collateral Value + Unrealized PnL + Earn Balance
  const collateralValue = assetDetails.reduce((acc, asset) => acc + asset.value, 0);
  const totalBalance = collateralValue + unrealizedPnL + totalEarnBalance;
  const availableMargin = Math.max(0, collateralValue - totalMarginLocked);
  const marginUsagePercent = collateralValue > 0 ? Math.min(100, (totalMarginLocked / collateralValue) * 100) : 0;

  return (
    <main className="w-full flex-1 max-w-[1600px] mx-auto p-4 lg:p-6 space-y-6 select-none animate-fadeIn">
      
      {/* 1. PORTFOLIO METRICS CARDS */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: 'Total Equity',
            value: `$${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            desc: 'Collateral + PnL + Earn',
            isPrimary: true
          },
          {
            label: 'Earn Balance',
            value: `$${totalEarnBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            desc: `+$${totalEarnYield.toFixed(2)} total yield`
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
            className={`bg-white dark:bg-[#13131a] border rounded-xl p-4 flex flex-col justify-between shadow-md relative overflow-hidden ${
              card.isPrimary 
                ? 'border-[#8b5cf6]/50 bg-gradient-to-tr from-[#3b82f6]/5 to-[#8b5cf6]/5' 
                : 'border-slate-200 dark:border-[#1f1f2e]'
            }`}
          >
            {card.isPrimary && (
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-[#8b5cf6] to-[#3b82f6] opacity-10 rounded-bl-full" />
            )}
            
            <div className="text-[10px] font-bold text-slate-500 dark:text-[#8a8a9e] uppercase tracking-wide flex items-center gap-1.5">
              {card.label}
            </div>

            <div className="my-2.5">
              <span className={`text-lg lg:text-xl font-black tracking-wide number-mono ${
                card.isPnl 
                  ? card.pnlVal >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'
                  : 'text-slate-900 dark:text-white'
              }`}>
                {card.value}
              </span>
            </div>

            <div className="text-[9px] text-slate-400 dark:text-slate-500 uppercase">{card.desc}</div>
          </div>
        ))}
      </section>

      {/* 2. ASSET ALLOCATION & MARGIN UTILIZATION SPLIT */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Asset Allocation Breakdown */}
        <div className="xl:col-span-2 bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] rounded-xl p-5 shadow-xl flex flex-col justify-between h-[300px]">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1f1f2e] pb-3 mb-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
              <Coins size={14} className="text-[#8b5cf6]" />
              Portfolio Asset Allocation
            </h3>
            <span className="text-[10px] text-slate-500 dark:text-[#8a8a9e] number-mono font-semibold">
              Total: ${collateralValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex-1 flex items-center h-full">
            {/* Pie Chart */}
            <div className="w-1/2 h-full min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetDetails.filter(a => a.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {assetDetails.filter(a => a.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    contentStyle={{ backgroundColor: '#13131a', border: '1px solid #1f1f2e', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend */}
            <div className="w-1/2 flex flex-col justify-center space-y-3 pl-4 border-l border-slate-100 dark:border-[#1f1f2e]/50">
              {assetDetails.filter(a => a.value > 0).map(asset => {
                const share = collateralValue > 0 ? (asset.value / collateralValue) * 100 : 0;
                return (
                  <div key={asset.name} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: asset.color }} />
                      <span className="truncate max-w-[120px]">{asset.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="number-mono font-bold text-slate-700 dark:text-slate-300">
                        {asset.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                      <div className="number-mono text-[10px] text-slate-400">
                        {share.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel: Margin Usage Meter */}
        <div className="bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] rounded-xl p-5 shadow-xl flex flex-col justify-between h-[300px]">
          <div>
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-[#1f1f2e] pb-3 mb-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
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
              <div className="w-full h-3 bg-slate-100 dark:bg-[#1f1f2e] rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full bg-gradient-to-r transition-all duration-300 ${
                    marginUsagePercent > 80 
                      ? 'from-amber-500 to-[#ef4444]' 
                      : 'from-[#3b82f6] to-[#8b5cf6]'
                  }`}
                  style={{ width: `${marginUsagePercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">
                <span>Safe</span>
                <span>Warning (80%)</span>
                <span>Liquidation</span>
              </div>
            </div>

            {/* Summary Details */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-[#8a8a9e]">Total Collateral Value</span>
                <span className="number-mono text-slate-900 dark:text-white">${collateralValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-[#8a8a9e]">Active Margin Locked</span>
                <span className="number-mono text-slate-900 dark:text-white">${totalMarginLocked.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-[#8a8a9e]">Unrealized PnL Buffer</span>
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
        <div className="xl:col-span-1 bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] rounded-xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-[#1f1f2e] pb-3">
            <Wallet size={16} className="text-[#8b5cf6]" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">Wallet Balances</h3>
          </div>

          <div className="space-y-3">
            {assetDetails.map(asset => (
              <div key={asset.symbol} className="p-3 bg-slate-50 dark:bg-[#0c0c10] border border-slate-200 dark:border-[#1f1f2e]/60 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">{asset.symbol}</span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase">{asset.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block number-mono">
                    {asset.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-[#8a8a9e] number-mono block">
                    ${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ACTIVE POSITIONS TABLE */}
        <div className="xl:col-span-2 bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-[#1f1f2e] pb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
              <Activity size={14} className="text-[#8b5cf6]" />
              Active Positions
            </h3>
            <span className="text-[10px] text-slate-500 dark:text-[#8a8a9e]">{positions.length} Open Position{positions.length !== 1 ? 's' : ''}</span>
          </div>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-[#1f1f2e] pb-2 font-bold uppercase text-[10px]">
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
                  <tr key={pos.id} className="hover:bg-slate-100 dark:hover:bg-[#1f1f2e] dark:bg-[#1f1f2e]/30">
                    <td className="py-3 font-bold text-slate-900 dark:text-white">{pos.symbol}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        pos.side === 'LONG' ? 'bg-[#10b981]/15 text-[#10b981]' : 'bg-[#ef4444]/15 text-[#ef4444]'
                      }`}>
                        {pos.side}
                      </span>
                    </td>
                    <td className="number-mono text-slate-700 dark:text-slate-200">{pos.leverage}x</td>
                    <td className="number-mono text-slate-700 dark:text-slate-200">${pos.entryPrice.toLocaleString()}</td>
                    <td className="number-mono text-slate-700 dark:text-slate-200">${pos.markPrice.toLocaleString()}</td>
                    <td className="number-mono text-slate-700 dark:text-slate-200">${pos.margin.toFixed(2)}</td>
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
                  <td colSpan={8} className="text-center text-slate-400 dark:text-slate-500 py-12">
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
