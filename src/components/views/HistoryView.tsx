'use client';

import React, { useState } from 'react';
import { useAppState } from '@/context/useAppState';
import { RefreshCw, Trash2, ArrowRightLeft, ArrowDownRight, ArrowUpRight, TrendingUp, TrendingDown, ExternalLink, History, Download } from 'lucide-react';

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

  const handleExportCSV = () => {
    if (filteredHistory.length === 0) return;
    
    const headers = ['Time', 'Category', 'Side', 'Amount/Size', 'Price', 'Status', 'Tx Hash'];
    const csvContent = [
      headers.join(','),
      ...filteredHistory.map(item => {
        return [
          `"${item.time}"`,
          `"${item.category || ''}"`,
          `"${item.side}"`,
          `"${item.size || (item as any).amount || ''}"`,
          `"${item.price || ''}"`,
          `"${item.status}"`,
          `"${item.txHash || ''}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `arc_history_${activeTab.toLowerCase()}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addNotification('success', 'Export Complete', 'Your transaction history has been downloaded as a CSV.');
  };

  return (
    <main className="w-full flex-1 max-w-[1200px] mx-auto p-4 lg:p-6 space-y-6 select-none animate-fadeIn">
      
      {/* Header Section */}
      <div className="space-y-4">
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-[#13131a] border border-slate-300 dark:border-slate-700 text-xs text-[#10b981] font-semibold">
          <History size={13} className="text-[#10b981]" />
          Transaction Explorer
        </div>

        {/* Title & Subtitle */}
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white dark:text-[#0c0c10] tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-[#10b981] bg-clip-text text-transparent">
            Transaction History
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#8a8a9e] mt-1">
            Track all your live swaps, vault, and perpetuals transactions on Arc Testnet
          </p>
        </div>

        {/* Action Buttons: Refresh & Clear & Export */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#13131a] hover:bg-slate-50 dark:hover:bg-[#1f1f2e] dark:bg-[#0c0c10] border border-slate-300 dark:border-slate-700 hover:border-[#10b981]/40 text-xs font-bold text-slate-900 dark:text-white dark:text-[#0c0c10] transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            <RefreshCw size={13} className={`text-[#10b981] ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredHistory.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 border border-[#8b5cf6]/20 hover:border-[#8b5cf6]/40 text-xs font-bold text-[#8b5cf6] transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            <Download size={13} className="text-[#8b5cf6]" />
            Export CSV
          </button>

          <button
            onClick={() => {
              if (history.length === 0) return;
              if (window.confirm('Clear all local transaction history logs?')) {
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
        <div className="flex bg-slate-50 dark:bg-[#0c0c10] border border-slate-200 dark:border-[#1f1f2e] p-1 rounded-xl w-fit text-xs font-bold gap-1 mt-4">
          {(['All', 'Swap', 'Vault', 'Perpetuals'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-[#10b981] text-black shadow-lg font-black'
                  : 'text-slate-500 dark:text-[#8a8a9e] hover:text-slate-900 dark:text-white dark:text-[#0c0c10]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table Container */}
      <div className="bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] rounded-2xl p-4 lg:p-6 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-[#1f1f2e] pb-3 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Type</th>
                <th className="px-4">Details</th>
                <th className="px-4">Status</th>
                <th className="px-4">PnL</th>
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
                  <tr key={item.id} className="hover:bg-slate-100 dark:hover:bg-[#1f1f2e] dark:bg-[#1f1f2e]/40 transition-colors">
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
                    <td className="px-4 font-bold text-slate-900 dark:text-white dark:text-[#0c0c10] text-xs">
                      {item.details || `${item.size} ${item.pair}`}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Success
                      </span>
                    </td>

                    {/* PnL */}
                    <td className="px-4 font-bold number-mono text-xs">
                      {item.realizedPnl !== undefined ? (
                        <span className={item.realizedPnl >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                          {item.realizedPnl >= 0 ? '+' : ''}${item.realizedPnl.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">-</span>
                      )}
                    </td>

                    {/* Relative Time */}
                    <td className="px-4 text-slate-500 dark:text-[#8a8a9e] number-mono text-xs">
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
                    <div className="flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-slate-500">
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
