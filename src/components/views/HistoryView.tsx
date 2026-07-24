'use client';

import React, { useState } from 'react';
import { useAppState } from '@/context/useAppState';
import { Download, Search, Calendar } from 'lucide-react';

export default function HistoryView() {
  const { history, addNotification } = useAppState();
  
  const [activeSubTab, setActiveSubTab] = useState<'All' | 'Trades' | 'Orders' | 'Deposits & Withdrawals'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // CSV Export
  const handleExportCSV = () => {
    const dataToExport = getFilteredData();
    if (dataToExport.length === 0) {
      addNotification('warning', 'Export Empty', 'No history records found for the current filters.');
      return;
    }

    const headers = 'Time,Pair,Side,Type,Size,Price,Fee,Status\n';
    const rows = dataToExport.map(row => 
      `"${row.time}","${row.pair}","${row.side}","${row.type}","${row.size}","${row.price}","${row.fee}","${row.status}"`
    ).join('\n');
    
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `arc_terminal_${activeSubTab.toLowerCase().replace(/[^a-z0-9]/g, '_')}_history.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addNotification(
      'success',
      'Export Successful',
      `Exported ${dataToExport.length} history records to CSV.`
    );
  };

  // Filter logic
  const getFilteredData = () => {
    return history.filter(item => {
      // 1. Category Subtab Filters
      if (activeSubTab === 'Trades') {
        if (item.side === 'DEPOSIT' || item.side === 'WITHDRAW') return false;
      } else if (activeSubTab === 'Orders') {
        if (item.type !== 'Limit' && item.type !== 'Stop') return false;
      } else if (activeSubTab === 'Deposits & Withdrawals') {
        if (item.side !== 'DEPOSIT' && item.side !== 'WITHDRAW') return false;
      }

      // 2. Search query filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
                            item.pair.toLowerCase().includes(searchLower) || 
                            item.side.toLowerCase().includes(searchLower) || 
                            item.status.toLowerCase().includes(searchLower) ||
                            item.type.toLowerCase().includes(searchLower);

      // 3. Date boundary filters
      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && item.time >= startDate;
      }
      if (endDate) {
        matchesDate = matchesDate && item.time <= endDate;
      }

      return matchesSearch && matchesDate;
    });
  };

  const filteredHistory = getFilteredData();

  return (
    <main className="w-full flex-1 max-w-[1600px] mx-auto p-4 lg:p-6 space-y-6 select-none animate-fadeIn">
      
      <div className="bg-[#09090c] border border-[#13131a] rounded-xl p-5 shadow-xl flex flex-col h-[600px] overflow-hidden">
        
        {/* Main Header Controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#13131a] pb-4 mb-4 shrink-0">
          
          {/* Category Filter Tabs */}
          <div className="flex bg-[#0d0d12] border border-[#13131a] p-0.5 rounded-lg text-xs">
            {[
              { id: 'All', label: 'All Activity' },
              { id: 'Trades', label: 'Trade History' },
              { id: 'Orders', label: 'Orders' },
              { id: 'Deposits & Withdrawals', label: 'Deposits & Withdrawals' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3 py-1.5 font-semibold rounded-md transition-all ${
                  activeSubTab === tab.id
                    ? 'bg-[#181822] text-[#8b5cf6] border border-[#8b5cf6]/20'
                    : 'text-[#8e8e9f] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0d0d12] border border-[#13131a] hover:border-[#8b5cf6]/50 hover:bg-[#13131c]/50 text-xs font-semibold text-white transition-all duration-200"
          >
            <Download size={13} className="text-[#8b5cf6]" />
            Export CSV
          </button>
        </div>

        {/* Search & Date Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-3 bg-[#0d0d12]/50 border border-[#13131a]/60 rounded-xl shrink-0">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-[#6e6e7f]" size={14} />
            <input
              type="text"
              placeholder="Search pair, side, status..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0d0d12] border border-[#13131a] focus:border-[#8b5cf6]/50 rounded-lg text-xs text-white placeholder-[#6e6e7f] outline-none transition-colors"
            />
          </div>

          {/* Start Date */}
          <div className="relative flex items-center">
            <Calendar className="absolute left-3 text-[#6e6e7f]" size={14} />
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0d0d12] border border-[#13131a] focus:border-[#8b5cf6]/50 rounded-lg text-xs text-white placeholder-[#6e6e7f] outline-none transition-colors"
            />
          </div>

          {/* End Date */}
          <div className="relative flex items-center">
            <Calendar className="absolute left-3 text-[#6e6e7f]" size={14} />
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0d0d12] border border-[#13131a] focus:border-[#8b5cf6]/50 rounded-lg text-xs text-white placeholder-[#6e6e7f] outline-none transition-colors"
            />
          </div>
        </div>

        {/* History Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#09090c] z-10">
              <tr className="text-[#6e6e7f] border-b border-[#13131a] pb-2 font-bold uppercase text-[10px]">
                <th className="py-2.5">Time</th>
                <th>Pair / Asset</th>
                <th>Side</th>
                <th>Type</th>
                <th>Size</th>
                <th>Execution Price</th>
                <th>Fee</th>
                <th className="text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#13131a]">
              {filteredHistory.map(row => {
                const isPositive = row.side === 'LONG' || row.side === 'BUY' || row.side === 'DEPOSIT';
                return (
                  <tr key={row.id} className="hover:bg-[#13131a]/30 transition-colors">
                    <td className="py-3 text-[#6e6e7f] number-mono text-[10px]">{row.time}</td>
                    <td className="font-bold text-white uppercase">{row.pair}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        isPositive ? 'bg-[#10b981]/15 text-[#10b981]' : 'bg-[#ef4444]/15 text-[#ef4444]'
                      }`}>
                        {row.side}
                      </span>
                    </td>
                    <td className="text-[#c7c7d6]">{row.type}</td>
                    <td className="number-mono text-white">{row.size}</td>
                    <td className="number-mono text-[#c7c7d6]">{row.price}</td>
                    <td className="number-mono text-[#6e6e7f]">{row.fee}</td>
                    <td className="text-right">
                      <span className={`font-bold text-[10px] px-2 py-0.5 rounded ${
                        row.status === 'FILLED' || row.status === 'SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : row.status === 'CANCELLED'
                          ? 'bg-[#1e1e2c] text-[#6e6e7f]'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-[#6e6e7f] py-16">
                    No history records match the current filters.
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
