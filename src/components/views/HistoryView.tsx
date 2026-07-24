'use client';

import React, { useState } from 'react';
import { useAppState } from '@/context/useAppState';
import { RefreshCw, Trash2, ArrowRightLeft, ArrowDownRight, ArrowUpRight, TrendingUp, TrendingDown, ExternalLink, History } from 'lucide-react';

export default function HistoryView() {
  const { history, clearHistory, addNotification } = useAppState();
  
  const [activeTab, setActiveTab] = useState<'All' | 'Swap' | 'Vault' | 'Perpetuals'>('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper for relative time
  const formatTime = (timeStr: string, timestamp?: number) => {
    if (!timestamp) return timeStr || 'Just now';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      addNotification('info', 'History Synced', 'Transaction history up to date.');
    }, 600);
  };

  // Filter history by selected tab
  const filteredHistory = history.filter(item => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Swap') return item.category === 'Swap' || item.side === 'SWAP';
    if (activeTab === 'Vault') return item.category === 'Vault' || item.side === 'DEPOSIT' || item.side === 'WITHDRAW';
    if (activeTab === 'Perpetuals') return item.category === 'Perpetuals' || item.side === 'LONG' || item.side === 'SHORT' || item.side === 'BUY' || item.side === 'SELL';
    return true;
  });

  return (
    <main className="w-full flex-1 max-w-[1200px] mx-auto p-4 lg:p-6 space-y-6 select-none animate-fadeIn">
      
      {/* Header Section */}
      <div className="space-y-4">
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#13131a] border border-[#232330] text-xs text-[#10b981] font-semibold">
          <History size={13} className="text-[#10b981]" />
          Transaction Explorer
        </div>

        {/* Title & Subtitle */}
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight bg-gradient-to-r from-white via-slate-200 to-[#10b981] bg-clip-text text-transparent">
            Transaction History
          </h1>
          <p className="text-xs text-[#8e8e9f] mt-1">
            Track all your live swaps, vault, and perpetuals transactions on Arc Testnet
          </p>
        </div>

        {/* Action Buttons: Refresh & Clear */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#13131a] hover:bg-[#1c1c28] border border-[#232330] hover:border-[#10b981]/40 text-xs font-bold text-white transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            <RefreshCw size={13} className={`text-[#10b981] ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => {
              if (history.length === 0) return;
              if (confirm('Clear all local transaction history logs?')) {
                clearHistory();
                addNotification('info', 'History Cleared', 'Transaction history logs cleared.');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-xs font-bold text-[#ef4444] transition-all cursor-pointer shadow-md"
          >
            <Trash2 size={13} className="text-[#ef4444]" />
            Clear
          </button>
        </div>

        {/* Category Tabs: All, Swap, Vault, Perpetuals */}
        <div className="flex bg-[#0d0d12] border border-[#13131a] p-1 rounded-xl w-fit text-xs font-bold gap-1 mt-4">
          {(['All', 'Swap', 'Vault', 'Perpetuals'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-[#10b981] text-black shadow-lg font-black'
                  : 'text-[#8e8e9f] hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table Container */}
      <div className="bg-[#09090c] border border-[#13131a] rounded-2xl p-4 lg:p-6 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-[#6e6e7f] border-b border-[#13131a] pb-3 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Type</th>
                <th className="px-4">Details</th>
                <th className="px-4">Status</th>
                <th className="px-4">Time</th>
                <th className="px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#13131a]/60">
              {filteredHistory.map(item => {
                const isSwap = item.category === 'Swap' || item.side === 'SWAP';
                const isVault = item.category === 'Vault' || item.side === 'DEPOSIT' || item.side === 'WITHDRAW';
                const isLong = item.side === 'LONG' || item.side === 'BUY';
                
                return (
                  <tr key={item.id} className="hover:bg-[#13131a]/40 transition-colors">
                    {/* Type Badge */}
                    <td className="py-4 px-4 font-bold">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold ${
                        isSwap
                          ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30'
                          : isVault
                          ? item.side === 'DEPOSIT' 
                            ? 'bg-[#3b82f6]/15 text-[#3b82f6] border border-[#3b82f6]/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : isLong
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                      }`}>
                        {isSwap && <ArrowRightLeft size={12} />}
                        {isVault && item.side === 'DEPOSIT' && <ArrowDownRight size={12} />}
                        {isVault && item.side === 'WITHDRAW' && <ArrowUpRight size={12} />}
                        {!isSwap && !isVault && isLong && <TrendingUp size={12} />}
                        {!isSwap && !isVault && !isLong && <TrendingDown size={12} />}
                        {item.type || item.side}
                      </span>
                    </td>

                    {/* Details */}
                    <td className="px-4 font-bold text-white text-xs">
                      {item.details || `${item.size} ${item.pair}`}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Success
                      </span>
                    </td>

                    {/* Relative Time */}
                    <td className="px-4 text-[#8e8e9f] number-mono text-xs">
                      {formatTime(item.time, item.timestamp)}
                    </td>

                    {/* Action Link */}
                    <td className="px-4 text-right">
                      {item.txHash ? (
                        <a
                          href={`https://testnet.arcscan.app/tx/${item.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#10b981] hover:underline"
                        >
                          View <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-[#4e4e5f] text-xs font-medium">Recorded</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center gap-3 text-[#6e6e7f]">
                      <History size={32} className="text-[#3e3e4f]" />
                      <p className="text-xs font-semibold">No transaction history recorded yet.</p>
                      <p className="text-[11px] text-[#4e4e5f]">
                        Perform a Swap, Vault Deposit, or Trade to view live transactions here.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </main>
  );
}
