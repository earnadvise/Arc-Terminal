'use client';

import React, { useState, useRef } from 'react';
import { useAppState } from '@/context/useAppState';
import { toPng } from 'html-to-image';
import TradingViewChart from './TradingViewChart';
import { Search, Scale, CircleAlert } from 'lucide-react';

export default function PerpetualsView() {
  const {
    markets,
    activePair,
    setActivePairBySymbol,
    positions,
    openOrders,
    history,
    walletConnected,
    balances,
    timeframe,
    setTimeframe,
    leverage,
    setLeverage,
    marginMode,
    setMarginMode,
    placeOrder,
    closePosition,
    adjustPositionMargin,
    cancelOrder,
    connectWallet,
    depositFunds,
    withdrawFunds,
    setTPSL
  } = useAppState();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Crypto' | 'Commodities' | 'Forex'>('All');
  const [orderType, setOrderType] = useState<'Market' | 'Limit' | 'Stop'>('Market');
  const [tradeSide, setTradeSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [inputPrice, setInputPrice] = useState<string>(activePair.lastPrice.toString());
  const [inputAmount, setInputAmount] = useState<string>('1.0');
  const [activeBottomTab, setActiveBottomTab] = useState<'Positions' | 'OpenOrders' | 'TradeHistory'>('Positions');
  const [tpPrice, setTpPrice] = useState<string>('');
  const [slPrice, setSlPrice] = useState<string>('');
  const [showTPSL, setShowTPSL] = useState(false);
  const [sharePosition, setSharePosition] = useState<any>(null);
  const [tpSlPosition, setTpSlPosition] = useState<any>(null);
  const [closingPosition, setClosingPosition] = useState<any>(null);
  const [closeSizeInput, setCloseSizeInput] = useState<string>('');
  const shareCardRef = useRef<HTMLDivElement>(null);

  const handleDownloadImage = async () => {
    if (shareCardRef.current) {
      try {
        const dataUrl = await toPng(shareCardRef.current, { cacheBust: true, pixelRatio: 2 });
        const link = document.createElement('a');
        link.download = `arcex-pnl-${sharePosition.symbol}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Failed to generate image', err);
      }
    }
  };

  React.useEffect(() => {
    setInputPrice(activePair.lastPrice.toString());
  }, [activePair.symbol]);

  const parsedPrice = parseFloat(inputPrice) || activePair.lastPrice;
  const parsedAmount = parseFloat(inputAmount) || 0;
  const positionSize = parsedAmount * (orderType === 'Market' ? activePair.lastPrice : parsedPrice);
  const marginRequired = leverage > 0 ? positionSize / leverage : 0;
  const feeEstimate = positionSize * 0.0006;
  const calculatedLiqPrice = tradeSide === 'LONG'
    ? parsedPrice * (1 - (1 / leverage) * 0.95)
    : parsedPrice * (1 + (1 / leverage) * 0.95);

  const handlePlaceOrder = () => {
    placeOrder(
      tradeSide,
      orderType.toUpperCase() as 'MARKET' | 'LIMIT' | 'STOP',
      parsedPrice,
      parsedAmount
    );
  };

  const filteredPairs = markets.filter(m => {
    const matchesSearch = m.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  let estimatedTPPnl: number | null = null;
  let estimatedSLPnl: number | null = null;
  if (tpSlPosition) {
    const tp = parseFloat(tpPrice);
    const sl = parseFloat(slPrice);
    if (!isNaN(tp)) {
      estimatedTPPnl = (tpSlPosition.side === 'LONG' ? tp - tpSlPosition.entryPrice : tpSlPosition.entryPrice - tp) * tpSlPosition.size;
    }
    if (!isNaN(sl)) {
      estimatedSLPnl = (tpSlPosition.side === 'LONG' ? sl - tpSlPosition.entryPrice : tpSlPosition.entryPrice - sl) * tpSlPosition.size;
    }
  }

  return (
    <main className="w-full flex-1 max-w-[1600px] mx-auto p-4 lg:p-6 grid grid-cols-1 xl:grid-cols-4 gap-4 select-none">

      {/* ── COL 1: MARKETS SIDEBAR ─────────────────────────────────── */}
      <section className="xl:col-span-1 bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] rounded-xl p-4 flex flex-col gap-3 shadow-xl" style={{ maxHeight: 820, minHeight: 680 }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">Perpetual Markets</h2>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-[#8a8a9e]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={13} />
          <input
            type="text"
            placeholder="Search perpetuals..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-[#0c0c10] border border-slate-200 dark:border-[#1f1f2e] focus:border-[#8b5cf6]/50 rounded-lg text-xs text-slate-900 dark:text-white placeholder-[#6e6e7f] outline-none transition-colors"
          />
        </div>

        <div className="flex bg-slate-50 dark:bg-[#0c0c10] border border-slate-200 dark:border-[#1f1f2e] p-0.5 rounded-lg">
          {(['All', 'Crypto', 'Commodities', 'Forex'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`flex-1 py-1 text-[9px] font-bold rounded-md transition-colors ${
                categoryFilter === cat
                  ? 'bg-sky-100 text-[#8b5cf6] border border-[#8b5cf6]/25'
                  : 'text-slate-500 dark:text-[#8a8a9e] hover:text-slate-900 dark:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-0.5 space-y-0.5">
          <div className="grid grid-cols-4 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase pb-2 border-b border-slate-200 dark:border-[#1f1f2e]">
            <span className="col-span-2">Symbol</span>
            <span className="text-right">Price</span>
            <span className="text-right">24h %</span>
          </div>
          {filteredPairs.map(m => {
            const isSelected = m.symbol === activePair.symbol;
            const isGainer = m.change24h >= 0;
            return (
              <div
                key={m.symbol}
                onClick={() => setActivePairBySymbol(m.symbol)}
                className={`grid grid-cols-4 items-center p-2 rounded-lg cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#3b82f6]/10 to-[#8b5cf6]/10 border border-[#8b5cf6]/30'
                    : 'border border-transparent hover:bg-slate-100 dark:hover:bg-[#1f1f2e] dark:bg-[#1f1f2e]/55'
                }`}
              >
                <div className="col-span-2">
                  <div className="text-[11px] font-semibold text-slate-900 dark:text-white">{m.symbol}</div>
                  <div className="text-[9px] text-slate-400 dark:text-slate-500">{m.name}</div>
                </div>
                <div className="text-right text-[10px] number-mono text-slate-800 dark:text-slate-100">
                  {m.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </div>
                <div className={`text-right text-[10px] font-semibold number-mono ${isGainer ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  {isGainer ? '+' : ''}{m.change24h}%
                </div>
              </div>
            );
          })}
          {filteredPairs.length === 0 && (
            <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-8">No results.</div>
          )}
        </div>
      </section>

      {/* ── COL 2+3: CHART AREA ─────────────────────────────────────── */}
      <section className="xl:col-span-2 flex flex-col gap-4">

        {/* Pair Header Row */}
        <div className="bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] rounded-xl px-4 py-3 flex items-center gap-6 overflow-x-auto shadow-xl">
          <div>
            <div className="text-base font-black text-slate-900 dark:text-white tracking-wide">{activePair.symbol}</div>
            <div className="text-[9px] text-slate-400 dark:text-slate-500 uppercase">{activePair.name}</div>
          </div>
          <div className="h-8 w-px bg-slate-100 dark:bg-[#1f1f2e]" />
          <div>
            <div className={`text-lg font-black number-mono ${activePair.change24h >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
              {activePair.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-[9px] number-mono font-semibold ${activePair.change24h >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
              {activePair.change24h >= 0 ? '+' : ''}{activePair.change24h}%
            </div>
          </div>
          {[
            { label: '24h High', value: activePair.high24h.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
            { label: '24h Low',  value: activePair.low24h.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
            { label: '24h Vol',  value: `$${(activePair.volume24h / 1e6).toFixed(2)}M` },
            { label: 'Open Interest', value: `$${(activePair.openInterest / 1e6).toFixed(2)}M` },
          ].map(stat => (
            <div key={stat.label} className="shrink-0">
              <div className="text-[9px] text-slate-400 dark:text-slate-500 uppercase">{stat.label}</div>
              <div className="text-xs number-mono text-slate-900 dark:text-white font-semibold">{stat.value}</div>
            </div>
          ))}

          {/* Timeframe selector */}
          <div className="ml-auto flex items-center gap-1">
            {['1m', '5m', '15m', '1h', '4h', '1D'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${
                  timeframe === tf
                    ? 'bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/30'
                    : 'text-slate-500 dark:text-[#8a8a9e] hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-[#1f1f2e] dark:bg-[#1f1f2e]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* TradingView Chart */}
        <div className="bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] rounded-xl overflow-hidden shadow-xl" style={{ height: 460 }}>
          <TradingViewChart symbol={activePair.symbol} timeframe={timeframe} />
        </div>

        {/* Bottom Positions / Orders Table */}
        <div className="bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] rounded-xl p-4 flex flex-col overflow-hidden shadow-xl" style={{ minHeight: 200 }}>
          <div className="flex items-center gap-1 mb-3 self-start">
            {[
              { id: 'Positions',     label: 'Positions',     count: positions.length },
              { id: 'OpenOrders',    label: 'Open Orders',   count: openOrders.length },
              { id: 'TradeHistory',  label: 'Trade History', count: null },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveBottomTab(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeBottomTab === tab.id
                    ? 'bg-sky-100 text-[#8b5cf6] border border-[#8b5cf6]/20'
                    : 'text-slate-500 dark:text-[#8a8a9e] hover:text-slate-900 dark:text-white'
                }`}
              >
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[9px] bg-[#8b5cf6]/20 text-[#8b5cf6] rounded-full">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          <div className="overflow-auto">
            {activeBottomTab === 'Positions' && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-[#1f1f2e] font-bold uppercase text-[10px]">
                    <th className="py-2">Market</th>
                    <th>Size</th><th>Entry</th><th>Mark</th>
                    <th>Liq</th><th>PnL</th><th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#13131a]">
                  {positions.map(pos => {
                    const isGain = pos.unrealizedPnl >= 0;
                    return (
                      <tr key={pos.id} className="hover:bg-slate-100 dark:hover:bg-[#1f1f2e] dark:bg-[#1f1f2e]/30 transition-colors">
                        <td className="py-2.5">
                          <div className="font-bold text-slate-900 dark:text-white">{pos.symbol}</div>
                          <div className={`text-[9px] font-bold ${pos.side === 'LONG' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                            {pos.side} {Number(pos.leverage).toLocaleString(undefined, { maximumFractionDigits: 2 })}x
                          </div>
                        </td>
                        <td className="number-mono text-slate-900 dark:text-white">{pos.size}</td>
                        <td className="number-mono text-slate-700 dark:text-slate-200">${pos.entryPrice.toLocaleString()}</td>
                        <td className="number-mono text-slate-700 dark:text-slate-200">${pos.markPrice.toLocaleString()}</td>
                        <td className="number-mono text-amber-500">${pos.liqPrice.toLocaleString()}</td>
                        <td className={`number-mono font-bold ${isGain ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                          {isGain ? '+' : ''}${pos.unrealizedPnl.toFixed(2)}
                        </td>
                        <td className="text-right flex items-center justify-end gap-1">
                          <button onClick={() => setTpSlPosition(pos)} className="px-2 py-1 text-[10px] font-bold text-slate-500 dark:text-[#8a8a9e] hover:text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#1f1f2e] dark:bg-[#1f1f2e] border border-slate-200 dark:border-[#1f1f2e] rounded transition-all" title="Set TP/SL">
                            TP/SL
                          </button>
                          <button onClick={() => setSharePosition(pos)} className="p-1 text-[#8b5cf6] hover:bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded transition-all" title="Share PnL">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                          </button>
                          <button onClick={async () => {
                            await closePosition(pos.id);
                            // Wait for blockchain to mine the close transaction
                            await new Promise(r => setTimeout(r, 8000));
                            await placeOrder(pos.side === 'LONG' ? 'SHORT' : 'LONG', 'MARKET', pos.markPrice, pos.size, pos.symbol, false, true);
                          }} className="px-2 py-1 text-[10px] font-semibold text-amber-500 hover:bg-amber-500/10 border border-amber-500/30 rounded transition-all" title="Reverse Position">
                            Reverse
                          </button>
                          <button onClick={() => {
                            setClosingPosition(pos);
                            setCloseSizeInput(pos.size.toString());
                          }} className="px-2 py-1 text-[10px] font-semibold text-[#ef4444] hover:bg-[#ef4444]/10 border border-[#ef4444]/30 rounded transition-all">Close</button>
                        </td>
                      </tr>
                    );
                  })}
                  {positions.length === 0 && (
                    <tr><td colSpan={9} className="text-center text-slate-400 dark:text-slate-500 py-6 text-xs">No active positions.</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeBottomTab === 'OpenOrders' && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-[#1f1f2e] font-bold uppercase text-[10px]">
                    <th className="py-2">Market</th><th>Type</th>
                    <th>Price</th><th>Amount</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#13131a]">
                  {openOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-100 dark:hover:bg-[#1f1f2e] dark:bg-[#1f1f2e]/30 transition-colors">
                      <td className="py-2.5">
                        <div className="font-bold text-slate-900 dark:text-white">{order.symbol}</div>
                        <div className={`text-[9px] font-bold ${order.side === 'BUY' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                          {order.side === 'BUY' ? 'LONG' : 'SHORT'} {Number(order.leverage).toLocaleString(undefined, { maximumFractionDigits: 2 })}x
                        </div>
                      </td>
                      <td className="text-slate-700 dark:text-slate-200">{order.type === 'TPSL' ? 'TP/SL' : order.type}</td>
                      <td className="number-mono text-slate-700 dark:text-slate-200">
                        {order.type === 'TPSL' ? (
                          <div className="flex flex-col text-[9px] leading-tight gap-0.5">
                            {order.tpPrice ? <span>TP: ${order.tpPrice.toLocaleString()}</span> : null}
                            {order.slPrice ? <span>SL: ${order.slPrice.toLocaleString()}</span> : null}
                          </div>
                        ) : (
                          <span>${order.price.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="number-mono text-slate-900 dark:text-white">{order.amount}</td>
                      <td className="text-right flex items-center justify-end gap-1.5 py-1.5 pr-2">
                        {order.type === 'TPSL' && (
                          <button onClick={() => {
                            const pos = positions.find(p => p.symbol === order.symbol);
                            if (pos) {
                              setTpPrice(order.tpPrice ? order.tpPrice.toString() : '');
                              setSlPrice(order.slPrice ? order.slPrice.toString() : '');
                              setTpSlPosition(pos);
                            }
                          }} className="px-2 py-1 text-[10px] text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-all">
                            Edit
                          </button>
                        )}
                        <button onClick={() => cancelOrder(order.id)} className="px-2 py-1 text-[10px] text-slate-500 dark:text-[#8a8a9e] hover:text-slate-900 dark:text-white bg-slate-100 dark:bg-[#1f1f2e] border border-[#1e1e2c] rounded transition-all">Cancel</button>
                      </td>
                    </tr>
                  ))}
                  {openOrders.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-slate-400 dark:text-slate-500 py-6">No open orders.</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeBottomTab === 'TradeHistory' && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-[#1f1f2e] font-bold uppercase text-[10px]">
                    <th className="py-2">Time</th><th>Market</th>
                    <th>Type</th><th>Size</th><th>Price</th><th>Fee</th><th>PnL</th><th>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#13131a]">
                  {history.filter(h => h.side !== 'DEPOSIT' && h.side !== 'WITHDRAW').slice(0, 8).map(h => (
                    <tr key={h.id}>
                      <td className="py-2.5 text-slate-400 dark:text-slate-500 number-mono text-[10px]">{h.time}</td>
                      <td>
                        <div className="font-bold text-slate-900 dark:text-white">{h.pair}</div>
                        <div className={`text-[9px] font-bold ${h.side === 'LONG' || h.side === 'BUY' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                          {h.side}
                        </div>
                      </td>
                      <td className="text-slate-700 dark:text-slate-200">{h.type}</td>
                      <td className="number-mono text-slate-700 dark:text-slate-200">{h.size}</td>
                      <td className="number-mono text-slate-700 dark:text-slate-200">{h.price}</td>
                      <td className="number-mono text-slate-400 dark:text-slate-500">{h.fee}</td>
                      <td className={`number-mono font-bold ${!h.realizedPnl ? 'text-slate-500 dark:text-[#8a8a9e]' : h.realizedPnl >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                        {h.realizedPnl !== undefined ? (h.realizedPnl >= 0 ? '+' : '') + '$' + h.realizedPnl.toFixed(2) : '-'}
                      </td>
                      <td><span className="text-emerald-500 font-semibold text-[10px]">{h.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      {/* ── COL 4: ORDER ENTRY ──────────────────────────────────────── */}
      <section className="xl:col-span-1 bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] rounded-xl p-4 flex flex-col shadow-xl" style={{ maxHeight: 820 }}>
        {/* Order Type */}
        <div className="flex bg-slate-50 dark:bg-[#0c0c10] border border-slate-200 dark:border-[#1f1f2e] p-0.5 rounded-lg mb-4">
          {(['Market', 'Limit'] as const).map(t => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                orderType === t ? 'bg-sky-100 text-[#8b5cf6] border border-[#8b5cf6]/20' : 'text-slate-500 dark:text-[#8a8a9e] hover:text-slate-900 dark:text-white'
              }`}
            >{t}</button>
          ))}
        </div>

        {/* Long / Short */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setTradeSide('LONG')}
            className={`py-2 text-xs font-bold rounded-lg border uppercase tracking-wider transition-all ${
              tradeSide === 'LONG'
                ? 'bg-[#10b981] text-slate-900 dark:text-white border-transparent shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                : 'border-slate-200 dark:border-[#1f1f2e] text-slate-500 dark:text-[#8a8a9e] hover:text-[#10b981]'
            }`}
          >Buy / Long</button>
          <button
            onClick={() => setTradeSide('SHORT')}
            className={`py-2 text-xs font-bold rounded-lg border uppercase tracking-wider transition-all ${
              tradeSide === 'SHORT'
                ? 'bg-[#ef4444] text-slate-900 dark:text-white border-transparent shadow-[0_0_15px_rgba(239,68,68,0.35)]'
                : 'border-slate-200 dark:border-[#1f1f2e] text-slate-500 dark:text-[#8a8a9e] hover:text-[#ef4444]'
            }`}
          >Sell / Short</button>
        </div>

        {/* Margin Mode */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-500 dark:text-[#8a8a9e]">Margin Mode</span>
          <div className="flex bg-slate-50 dark:bg-[#0c0c10] border border-slate-200 dark:border-[#1f1f2e] p-0.5 rounded-md text-[10px]">
            {['CROSS', 'ISOLATED'].map(mode => (
              <button
                key={mode}
                onClick={() => setMarginMode(mode as any)}
                className={`px-2 py-0.5 font-bold rounded transition-colors ${
                  marginMode === mode ? 'bg-sky-100 text-[#8b5cf6] border border-[#8b5cf6]/15' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-200'
                }`}
              >{mode}</button>
            ))}
          </div>
        </div>

        {/* Price */}
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-xs text-slate-500 dark:text-[#8a8a9e]">Price {orderType === 'Market' && <span className="text-amber-500 text-[10px] font-bold bg-amber-500/10 px-1 rounded ml-1">MARKET</span>}</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">USDC</span>
          </div>
          <input
            type="text"
            disabled={orderType === 'Market'}
            value={orderType === 'Market' ? activePair.lastPrice : inputPrice}
            onChange={e => setInputPrice(e.target.value)}
            className={`w-full px-3 py-2 bg-slate-50 dark:bg-[#0c0c10] border rounded-lg text-xs number-mono text-slate-900 dark:text-white outline-none transition-colors ${
              orderType === 'Market' ? 'border-slate-200 dark:border-[#1f1f2e] text-slate-500 dark:text-[#8a8a9e] cursor-not-allowed' : 'border-slate-200 dark:border-[#1f1f2e] focus:border-[#8b5cf6]/50'
            }`}
          />
        </div>

        {/* Amount */}
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-xs text-slate-500 dark:text-[#8a8a9e]">Amount</span>
            <span className="text-[10px] text-slate-500 dark:text-[#8a8a9e] number-mono uppercase">{activePair.symbol.split('-')[0]}</span>
          </div>
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputAmount}
              onChange={e => setInputAmount(e.target.value)}
              className="w-full pl-3 pr-14 py-2 bg-slate-50 dark:bg-[#0c0c10] border border-slate-200 dark:border-[#1f1f2e] focus:border-[#8b5cf6]/50 rounded-lg text-xs number-mono text-slate-900 dark:text-white outline-none transition-colors"
            />
            <button
              onClick={() => {
                const available = balances.vaultUSDC;
                const maxPositionUSD = available * leverage * 0.99;
                const maxSize = maxPositionUSD / parsedPrice;
                setInputAmount(maxSize > 0 ? maxSize.toFixed(4) : '0');
              }}
              className="absolute right-2 px-2 py-0.5 bg-white dark:bg-[#13131a]/5 hover:bg-white dark:bg-[#13131a]/10 border border-white/10 text-[9px] font-bold text-slate-900 dark:text-white rounded transition-colors cursor-pointer"
            >
              MAX
            </button>
          </div>
        </div>



        {/* Leverage Slider (Capped at 20x Max) */}
        <div className="mb-5">
          <div className="flex justify-between mb-1">
            <span className="text-xs text-slate-500 dark:text-[#8a8a9e] flex items-center gap-1"><Scale size={12} /> Leverage (Max 20x)</span>
            <span className="text-xs font-bold text-[#8b5cf6] number-mono">{leverage}x</span>
          </div>
          <input
            type="range" min="1" max="20" value={leverage}
            onChange={e => setLeverage(parseInt(e.target.value))}
            className="w-full h-1 bg-slate-100 dark:bg-[#1f1f2e] rounded-lg appearance-none cursor-pointer accent-[#8b5cf6]"
          />
          <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1 mb-2">
            <span>1x</span><span>5x</span><span>10x</span><span>15x</span><span>20x</span>
          </div>

          {/* Quick-Select Leverage Presets */}
          <div className="flex gap-1">
            {[2, 5, 10, 15, 20].map(levVal => (
              <button
                key={levVal}
                onClick={() => setLeverage(levVal)}
                className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${
                  leverage === levVal
                    ? 'bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/40 shadow-sm'
                    : 'bg-slate-50 dark:bg-[#0c0c10] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-[#1f1f2e] hover:text-slate-900 dark:text-white hover:border-slate-200 dark:border-[#1f1f2e]'
                }`}
              >
                {levVal}x
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-1.5 text-xs text-slate-500 dark:text-[#8a8a9e] border-t border-slate-200 dark:border-[#1f1f2e] pt-3 mb-3">
          {[
            ['Position Value', `$${positionSize.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`],
            ['Required Margin', `$${marginRequired.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`],
            ['Effective Leverage', `${leverage}x`],
              ['Funding (1h)', '0.0051%'],
            ['Est. Liq. Price', `$${calculatedLiqPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
            ['Taker Fee (0.06%)', `$${feeEstimate.toLocaleString(undefined, { maximumFractionDigits: 4 })} USDC`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span>{label}</span>
              <span className={`number-mono ${label === 'Required Margin' ? 'text-[#01C38E] font-bold' : label === 'Effective Leverage' ? 'text-[#8b5cf6] font-bold' : 'text-slate-700 dark:text-slate-200'}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Available */}
        <div className="flex flex-col gap-2 bg-slate-50 dark:bg-[#0c0c10] border border-slate-200 dark:border-[#1f1f2e] px-3 py-2 rounded-lg mb-3">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-slate-400 dark:text-slate-500">Vault Margin:</span>
            <span className="number-mono font-bold text-slate-900 dark:text-white">${balances.vaultUSDC.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => {
              const amt = window.prompt('Enter USDC amount to deposit for trading:');
              if (amt && !isNaN(parseFloat(amt))) depositFunds(parseFloat(amt));
            }} className="flex-1 py-1.5 bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] rounded text-[10px] font-bold border border-[#10b981]/20 transition-colors">Deposit</button>
            <button onClick={() => {
              const amt = window.prompt('Enter USDC amount to withdraw from trading:');
              if (amt && !isNaN(parseFloat(amt))) withdrawFunds(parseFloat(amt));
            }} className="flex-1 py-1.5 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] rounded text-[10px] font-bold border border-[#ef4444]/20 transition-colors">Withdraw</button>
          </div>
        </div>

        {/* Action */}
        {walletConnected ? (
          <button
            onClick={handlePlaceOrder}
            disabled={parsedAmount <= 0}
            className={`w-full py-3 rounded-lg text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider transition-all ${
              parsedAmount <= 0
                ? 'bg-sky-100 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-[#1f1f2e] cursor-not-allowed'
                : tradeSide === 'LONG'
                ? 'bg-[#10b981] hover:bg-[#12cf92] shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                : 'bg-[#ef4444] hover:bg-[#fa5555] shadow-[0_0_15px_rgba(239,68,68,0.25)]'
            }`}
          >
            {parsedAmount <= 0 ? 'Enter Amount' : tradeSide === 'LONG' ? 'Place Long / Buy' : 'Place Short / Sell'}
          </button>
        ) : (
          <button
            onClick={() => connectWallet('MetaMask')}
            className="w-full py-3 rounded-lg text-xs font-bold text-slate-900 dark:text-white bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:from-[#4f8ff7] hover:to-[#996cf7] uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(59,130,246,0.35)]"
          >
            Connect Wallet
          </button>
        )}
      </section>

      {/* PnL Share Modal */}
      {sharePosition && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm relative flex flex-col items-center">
            
            {/* The Downloadable Card */}
            <div 
              ref={shareCardRef}
              className="bg-[#0b0c10] border border-[#1f2937] rounded-3xl w-full overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] relative mb-6"
            >
              {/* Premium Glow Effects */}
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b ${sharePosition.unrealizedPnl >= 0 ? 'from-[#10b981]/15' : 'from-[#ef4444]/15'} to-transparent opacity-70 pointer-events-none`} />
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-white dark:bg-[#13131a]/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-white dark:bg-[#13131a]/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="p-8 text-center relative z-10">
                <div className="flex items-center justify-center gap-2 mb-6 opacity-80">
                  <div className="w-6 h-6 rounded bg-gradient-to-tr from-[#34d399] to-[#059669] flex items-center justify-center shadow-lg shadow-[#10b981]/30">
                    <span className="text-white dark:text-[#0c0c10] text-[10px] font-black">A</span>
                  </div>
                  <div className="text-[11px] font-black text-white dark:text-[#0c0c10] tracking-[0.2em] uppercase">Arc Terminal AI</div>
                </div>
                
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className={`px-2.5 py-0.5 rounded-sm text-[10px] font-black tracking-widest ${sharePosition.side === 'LONG' ? 'bg-[#10b981] text-black shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-[#ef4444] text-white dark:text-[#0c0c10] shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}>{sharePosition.side}</span>
                  <span className="text-xl font-black text-white dark:text-[#0c0c10] tracking-wide">{sharePosition.symbol}</span>
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-white dark:bg-[#13131a]/10 px-1.5 py-0.5 rounded">{Number(sharePosition.leverage).toLocaleString(undefined, { maximumFractionDigits: 2 })}x</span>
                </div>
                
                <div className={`text-6xl font-black number-mono mb-2 ${sharePosition.unrealizedPnl >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'} drop-shadow-lg tracking-tighter`}>
                  {sharePosition.unrealizedPnl >= 0 ? '+' : ''}{sharePosition.margin > 0 ? ((sharePosition.unrealizedPnl / sharePosition.margin) * 100).toFixed(2) : 0}%
                </div>
                <div className={`text-3xl font-black number-mono mb-8 ${sharePosition.unrealizedPnl >= 0 ? 'text-[#10b981]/90' : 'text-[#ef4444]/90'} drop-shadow-sm`}>
                  {sharePosition.unrealizedPnl >= 0 ? '+' : ''}${sharePosition.unrealizedPnl.toFixed(2)}
                </div>

                <div className="grid grid-cols-2 gap-4 text-left bg-[#111827]/80 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-inner">
                  <div>
                    <div className="text-[9px] text-slate-500 dark:text-[#8a8a9e] font-bold tracking-widest uppercase mb-0.5">Entry Price</div>
                    <div className="text-sm font-black text-white dark:text-[#0c0c10] number-mono">${sharePosition.entryPrice.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 dark:text-[#8a8a9e] font-bold tracking-widest uppercase mb-0.5">Mark Price</div>
                    <div className="text-sm font-black text-white dark:text-[#0c0c10] number-mono">${sharePosition.markPrice.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions (Not part of the downloaded image) */}
            <div className="w-full flex gap-3">
              <button onClick={() => setSharePosition(null)} className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-900 bg-white hover:bg-slate-200 transition-colors backdrop-blur-md">Close</button>
              <button onClick={() => {
                navigator.clipboard.writeText(`I'm ${sharePosition.side} ${sharePosition.symbol} with ${sharePosition.leverage}x leverage on Arc Terminal AI! PnL: ${sharePosition.unrealizedPnl >= 0 ? '+' : ''}${sharePosition.margin > 0 ? ((sharePosition.unrealizedPnl / sharePosition.margin) * 100).toFixed(2) : 0}%`);
                alert('Copied to clipboard!');
              }} className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-900 bg-white hover:bg-slate-200 transition-colors backdrop-blur-md">Copy Text</button>
              <button onClick={handleDownloadImage} className="flex-[2] py-3 rounded-xl text-xs font-bold text-white dark:text-[#0c0c10] bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(139,92,246,0.3)] border border-white/10">Download Image</button>
            </div>
            
          </div>
        </div>
      )}
      {/* TP / SL Modal */}
      {tpSlPosition && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <div className="p-5 border-b border-slate-100 dark:border-[#1f1f2e] flex justify-between items-center bg-slate-50 dark:bg-[#0c0c10]">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Set TP / SL</h3>
              <button onClick={() => setTpSlPosition(null)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tpSlPosition.side === 'LONG' ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>{tpSlPosition.side}</span>
                <span className="font-black text-slate-800 dark:text-slate-100">{tpSlPosition.symbol}</span>
                <span className="text-xs font-bold text-slate-500 dark:text-[#8a8a9e]">{tpSlPosition.leverage}x</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">Take Profit Price</label>
                  <input
                    type="text"
                    placeholder="0.00"
                    value={tpPrice}
                    onChange={e => setTpPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c0c10] border border-slate-200 dark:border-[#1f1f2e] focus:border-[#10b981]/50 focus:ring-2 focus:ring-[#10b981]/20 rounded-lg text-sm font-bold number-mono text-slate-900 dark:text-white outline-none transition-all"
                  />
                  {estimatedTPPnl !== null && (
                    <div className={`mt-1.5 text-[10px] font-bold ${estimatedTPPnl >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                      Est. PnL: {estimatedTPPnl >= 0 ? '+' : ''}${estimatedTPPnl.toFixed(2)}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">Stop Loss Price</label>
                  <input
                    type="text"
                    placeholder="0.00"
                    value={slPrice}
                    onChange={e => setSlPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c0c10] border border-slate-200 dark:border-[#1f1f2e] focus:border-[#ef4444]/50 focus:ring-2 focus:ring-[#ef4444]/20 rounded-lg text-sm font-bold number-mono text-slate-900 dark:text-white outline-none transition-all"
                  />
                  {estimatedSLPnl !== null && (
                    <div className={`mt-1.5 text-[10px] font-bold ${estimatedSLPnl >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                      Est. PnL: {estimatedSLPnl >= 0 ? '+' : ''}${estimatedSLPnl.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-[#0c0c10] border-t border-slate-100 dark:border-[#1f1f2e] flex gap-3">
              <button onClick={() => setTpSlPosition(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] hover:bg-slate-50 dark:hover:bg-[#1f1f2e] dark:bg-[#0c0c10] transition-colors">Cancel</button>
              <button onClick={() => {
                if (tpPrice || slPrice) {
                  const tp = tpPrice ? parseFloat(tpPrice) : 0;
                  const sl = slPrice ? parseFloat(slPrice) : 0;
                  setTPSL(tpSlPosition.symbol, tp, sl);
                }
                setTpPrice('');
                setSlPrice('');
                setTpSlPosition(null);
              }} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white dark:text-[#0c0c10] bg-[#8b5cf6] hover:bg-[#7c3aed] transition-colors shadow-lg shadow-[#8b5cf6]/30">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Close Modal */}
      {closingPosition && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <div className="p-5 border-b border-slate-100 dark:border-[#1f1f2e] flex justify-between items-center bg-slate-50 dark:bg-[#0c0c10]">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Close Position</h3>
              <button onClick={() => setClosingPosition(null)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${closingPosition.side === 'LONG' ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>{closingPosition.side}</span>
                <span className="font-black text-slate-800 dark:text-slate-100">{closingPosition.symbol}</span>
                <span className="text-xs font-bold text-slate-500 dark:text-[#8a8a9e]">Total Size: {closingPosition.size}</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">Amount to Close</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={closeSizeInput}
                      onChange={e => setCloseSizeInput(e.target.value)}
                      className="w-full pl-3 pr-16 py-2 bg-slate-50 dark:bg-[#0c0c10] border border-slate-200 dark:border-[#1f1f2e] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/20 rounded-lg text-sm font-bold number-mono text-slate-900 dark:text-white outline-none transition-all"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                       <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{closingPosition.symbol.split('-')[0]}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {[0.25, 0.5, 0.75, 1].map(fraction => (
                    <button
                      key={fraction}
                      onClick={() => setCloseSizeInput((closingPosition.size * fraction).toFixed(4))}
                      className="flex-1 py-1.5 text-[10px] font-bold text-slate-500 dark:text-[#8a8a9e] hover:text-slate-900 dark:text-white bg-slate-100 dark:bg-[#1f1f2e] hover:bg-slate-200 rounded-md transition-colors"
                    >
                      {fraction * 100}%
                    </button>
                  ))}
                </div>
                
                {(() => {
                  const inputVal = parseFloat(closeSizeInput);
                  if (!isNaN(inputVal) && inputVal > 0) {
                     const fraction = Math.min(inputVal / closingPosition.size, 1);
                     const estPnl = closingPosition.unrealizedPnl * fraction;
                     return (
                        <div className="pt-2 text-xs font-bold text-slate-600 dark:text-slate-300 flex justify-between">
                          <span>Est. Realized PnL:</span>
                          <span className={estPnl >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                             {estPnl >= 0 ? '+' : ''}${estPnl.toFixed(2)}
                          </span>
                        </div>
                     );
                  }
                  return null;
                })()}

              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-[#0c0c10] border-t border-slate-100 dark:border-[#1f1f2e] flex gap-3">
              <button onClick={() => setClosingPosition(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] hover:bg-slate-50 dark:hover:bg-[#1f1f2e] dark:bg-[#0c0c10] transition-colors">Cancel</button>
              <button onClick={() => {
                const amt = parseFloat(closeSizeInput);
                if (!isNaN(amt) && amt > 0) {
                  closePosition(closingPosition.id, amt);
                }
                setClosingPosition(null);
              }} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white dark:text-[#0c0c10] bg-[#ef4444] hover:bg-[#dc2626] transition-colors shadow-lg shadow-[#ef4444]/30">Confirm Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
