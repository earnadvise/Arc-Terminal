'use client';

import React, { useState } from 'react';
import { useAppState } from '@/context/useAppState';
import { Download, Search, Calendar, FileSpreadsheet, RefreshCcw } from 'lucide-react';

export default function HistoryView() {
  const { history, addNotification } = useAppState();
  
  const [activeSubTab, setActiveSubTab] = useState<'Orders' | 'Trades' | 'Deposits' | 'Withdrawals' | 'Funding'>('Trades');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // CSV Export simulator
  const handleExportCSV = () => {
    const dataToExport = getFilteredData();
    if (dataToExport.length === 0) {
      addNotification('warning', 'Export Empty', 'No history records found for the current filters.');
      return;
    }

    // Generate CSV contents
    const headers = 'Time,Pair,Side,Type,Size,Price,Fee,Status\n';
    const rows = dataToExport.map(row => 
      `"${row.time}","${row.pair}","${row.side}","${row.type}","${row.size}","${row.price}","${row.fee}","${row.status}"`
    ).join('\n');
    
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `arc_terminal_${activeSubTab.toLowerCase()}_history.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addNotification(
      'success',
      'Export Successful',
      `Exported ${dataToExport.length} rows of ${activeSubTab} History to CSV.`
    );
  };

  // Filter logic
  const getFilteredData = () => {
    return history.filter(item => {
      // 1. Tab filters
      if (activeSubTab === 'Trades') {
        if (item.side === 'DEPOSIT' || item.side === 'WITHDRAW' || item.type === 'Funding') return false;
      } else if (activeSubTab === 'Orders') {
        // Orders are represented by limits/stop triggers that were cancelled or placed
        if (item.type !== 'Limit' && item.type !== 'Stop') return false;
      } else if (activeSubTab === 'Deposits') {
        if (item.side !== 'DEPOSIT') return false;
      } else if (activeSubTab === 'Withdrawals') {
        if (item.side !== 'WITHDRAW') return false;
      } else if (activeSubTab === 'Funding') {
        if (item.type !== 'Funding') return false;
      }

      // 2. Search query filters
      const matchesSearch = item.pair.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.side.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.status.toLowerCase().includes(searchTerm.toLowerCase());

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
    <main className="w-full flex-1 max-w-[1600px] mx-auto p-4 lg:p-6 space-y-6 select-none">
      
      <div className="bg-[#09090c] border border-[#13131a] rounded-xl p-5 shadow-xl flex flex-col h-[580px] overflow-hidden">
        {/* Main Header Controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#13131a] pb-4 mb-4">
          {/* Sub Tab Swappers */}
          <div className="flex bg-[#0d0d12] border border-[#13131a] p-0.5 rounded-lg text-xs">
            {[
              { id: 'Orders', label: 'Order History' },
              { id: 'Trades', label: 'Trade History' },
              { id: 'Deposits', label: 'Deposit History' },
              { id: 'Withdrawals', label: 'Withdrawal History' },
              { id: 'Funding', label: 'Funding Payments' }
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

          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0d0d12] border border-[#13131a] hover:border-[#8b5cf6]/50 hover:bg-[#13131c]/50 text-xs font-semibold text-white transition-all duration-200"
          >
            <Download size={13} className="text-[#8b5cf6]" />
            Export CSV
          </button>
        </div>

        {/* Filters Panel (Search + Dates) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-3 bg-[#0d0d12]/50 border border-[#13131a]/60 rounded-xl">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-[#6e6e7f]" size={14} />
            <input
              type="text"
              placeholder="Filter by pair, side, status..."
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
              placeholder="Start Date"
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
              placeholder="End Date"
              className="w-full pl-9 pr-4 py-2 bg-[#0d0d12] border border-[#13131a] focus:border-[#8b5cf6]/50 rounded-lg text-xs text-white placeholder-[#6e6e7f] outline-none transition-colors"
            />
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-auto pr-1">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[#6e6e7f] border-b border-[#13131a] pb-2 font-bold uppercase text-[10px]">
                <th className="py-2.5">Time</th>
                <th>Pair / Asset</th>
                <th>Side</th>
                <th>Type</th>
                <th>Size</th>
                <th>Execution Price</th>
                <th>Fee Charged</th>
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
                      <span className={`font-semibold text-[10px] ${
                        row.status === 'CANCELLED' ? 'text-[#6e6e7f]' : 'text-emerald-500'
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
                    No history logs match the filters or search keywords.
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
