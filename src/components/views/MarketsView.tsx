'use client';

import React, { useState } from 'react';
import { useAppState } from '@/context/useAppState';
import TradingViewChart from './TradingViewChart';
import { Search, Scale, CircleAlert } from 'lucide-react';

export default function MarketsView() {
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
    cancelOrder,
    connectWallet
  } = useAppState();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Crypto' | 'Commodities' | 'Forex'>('All');
  const [orderType, setOrderType] = useState<'Market' | 'Limit' | 'Stop'>('Market');
  const [tradeSide, setTradeSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [inputPrice, setInputPrice] = useState<string>(activePair.lastPrice.toString());
  const [inputAmount, setInputAmount] = useState<string>('1.0');
  const [activeBottomTab, setActiveBottomTab] = useState<'Positions' | 'OpenOrders' | 'TradeHistory' | 'FundingHistory'>('Positions');

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

  return (
    <main className="w-full flex-1 max-w-[1600px] mx-auto p-4 lg:p-6 grid grid-cols-1 xl:grid-cols-4 gap-4 select-none">

      {/* ── COL 1: MARKETS SIDEBAR ─────────────────────────────────── */}
      <section className="xl:col-span-1 bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 shadow-xl" style={{ maxHeight: 820, minHeight: 680 }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Markets</h2>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={13} />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#8b5cf6]/50 rounded-lg text-xs text-slate-900 placeholder-[#6e6e7f] outline-none transition-colors"
          />
        </div>

        <div className="flex bg-slate-50 border border-slate-200 p-0.5 rounded-lg">
          {(['All', 'Crypto', 'Commodities', 'Forex'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`flex-1 py-1 text-[9px] font-bold rounded-md transition-colors ${
                categoryFilter === cat
                  ? 'bg-sky-100 text-[#8b5cf6] border border-[#8b5cf6]/25'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-0.5 space-y-0.5">
          <div className="grid grid-cols-4 text-[9px] font-bold text-slate-400 uppercase pb-2 border-b border-slate-200">
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
                    : 'border border-transparent hover:bg-slate-100/55'
                }`}
              >
                <div className="col-span-2">
                  <div className="text-[11px] font-semibold text-slate-900">{m.symbol}</div>
                  <div className="text-[9px] text-slate-400">{m.name}</div>
                </div>
                <div className="text-right text-[10px] number-mono text-slate-800">
                  {m.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </div>
                <div className={`text-right text-[10px] font-semibold number-mono ${isGainer ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  {isGainer ? '+' : ''}{m.change24h}%
                </div>
              </div>
            );
          })}
          {filteredPairs.length === 0 && (
            <div className="text-center text-xs text-slate-400 py-8">No results.</div>
          )}
        </div>
      </section>

      {/* ── COL 2+3: CHART AREA ─────────────────────────────────────── */}
      <section className="xl:col-span-2 flex flex-col gap-4">

        {/* Pair Header Row */}
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-6 overflow-x-auto shadow-xl">
          <div>
            <div className="text-base font-black text-slate-900 tracking-wide">{activePair.symbol}</div>
            <div className="text-[9px] text-slate-400 uppercase">{activePair.name}</div>
          </div>
          <div className="h-8 w-px bg-slate-100" />
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
              <div className="text-[9px] text-slate-400 uppercase">{stat.label}</div>
              <div className="text-xs number-mono text-slate-900 font-semibold">{stat.value}</div>
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
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* TradingView Chart */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl" style={{ height: 460 }}>
          <TradingViewChart symbol={activePair.symbol} timeframe={timeframe} />
        </div>

        {/* Bottom Positions / Orders Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col overflow-hidden shadow-xl" style={{ minHeight: 200 }}>
          <div className="flex items-center gap-1 mb-3 self-start">
            {[
              { id: 'Positions',     label: 'Positions',     count: positions.length },
              { id: 'OpenOrders',    label: 'Open Orders',   count: openOrders.length },
              { id: 'TradeHistory',  label: 'Trade History', count: null },
              { id: 'FundingHistory',label: 'Funding',       count: null },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveBottomTab(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeBottomTab === tab.id
                    ? 'bg-sky-100 text-[#8b5cf6] border border-[#8b5cf6]/20'
                    : 'text-slate-500 hover:text-slate-900'
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
                  <tr className="text-slate-400 border-b border-slate-200 font-bold uppercase text-[10px]">
                    <th className="py-2">Market</th><th>Side</th><th>Lev</th>
                    <th>Size</th><th>Entry</th><th>Mark</th>
                    <th>Liq</th><th>PnL</th><th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#13131a]">
                  {positions.map(pos => {
                    const isGain = pos.unrealizedPnl >= 0;
                    return (
                      <tr key={pos.id} className="hover:bg-slate-100/30 transition-colors">
                        <td className="py-2.5 font-bold text-slate-900">{pos.symbol}</td>
                        <td><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${pos.side === 'LONG' ? 'bg-[#10b981]/15 text-[#10b981]' : 'bg-[#ef4444]/15 text-[#ef4444]'}`}>{pos.side}</span></td>
                        <td className="number-mono text-slate-700">{pos.leverage}x</td>
                        <td className="number-mono text-slate-900">{pos.size}</td>
                        <td className="number-mono text-slate-700">${pos.entryPrice.toLocaleString()}</td>
                        <td className="number-mono text-slate-700">${pos.markPrice.toLocaleString()}</td>
                        <td className="number-mono text-amber-500">${pos.liqPrice.toLocaleString()}</td>
                        <td className={`number-mono font-bold ${isGain ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                          {isGain ? '+' : ''}${pos.unrealizedPnl.toFixed(2)}
                        </td>
                        <td className="text-right">
                          <button onClick={() => closePosition(pos.id)} className="px-2 py-1 text-[10px] font-semibold text-[#ef4444] hover:bg-[#ef4444]/10 border border-[#ef4444]/30 rounded transition-all">Close</button>
                        </td>
                      </tr>
                    );
                  })}
                  {positions.length === 0 && (
                    <tr><td colSpan={9} className="text-center text-slate-400 py-6 text-xs">No active positions.</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeBottomTab === 'OpenOrders' && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200 font-bold uppercase text-[10px]">
                    <th className="py-2">Market</th><th>Side</th><th>Type</th>
                    <th>Price</th><th>Amount</th><th>Lev</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#13131a]">
                  {openOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-100/30 transition-colors">
                      <td className="py-2.5 font-bold text-slate-900">{order.symbol}</td>
                      <td><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${order.side === 'BUY' ? 'bg-[#10b981]/15 text-[#10b981]' : 'bg-[#ef4444]/15 text-[#ef4444]'}`}>{order.side === 'BUY' ? 'LONG' : 'SHORT'}</span></td>
                      <td className="text-slate-700">{order.type}</td>
                      <td className="number-mono text-slate-700">${order.price.toLocaleString()}</td>
                      <td className="number-mono text-slate-900">{order.amount}</td>
                      <td className="number-mono text-slate-700">{order.leverage}x</td>
                      <td className="text-right">
                        <button onClick={() => cancelOrder(order.id)} className="px-2 py-1 text-[10px] text-slate-500 hover:text-slate-900 bg-slate-100 border border-[#1e1e2c] rounded transition-all">Cancel</button>
                      </td>
                    </tr>
                  ))}
                  {openOrders.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-slate-400 py-6">No open orders.</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeBottomTab === 'TradeHistory' && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200 font-bold uppercase text-[10px]">
                    <th className="py-2">Time</th><th>Pair</th><th>Side</th>
                    <th>Type</th><th>Size</th><th>Price</th><th>Fee</th><th>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#13131a]">
                  {history.filter(h => h.side !== 'DEPOSIT' && h.side !== 'WITHDRAW').slice(0, 8).map(h => (
                    <tr key={h.id}>
                      <td className="py-2.5 text-slate-400 number-mono text-[10px]">{h.time}</td>
                      <td className="font-bold text-slate-900">{h.pair}</td>
                      <td><span className={`text-[9px] font-bold ${h.side === 'LONG' || h.side === 'BUY' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{h.side}</span></td>
                      <td className="text-slate-700">{h.type}</td>
                      <td className="number-mono text-slate-700">{h.size}</td>
                      <td className="number-mono text-slate-700">{h.price}</td>
                      <td className="number-mono text-slate-400">{h.fee}</td>
                      <td><span className="text-emerald-500 font-semibold text-[10px]">{h.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeBottomTab === 'FundingHistory' && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200 font-bold uppercase text-[10px]">
                    <th className="py-2">Time</th><th>Market</th><th>Rate</th><th>Settlement</th><th>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#13131a]">
                  <tr className="hover:bg-slate-100/30">
                    <td className="py-2.5 number-mono text-slate-400 text-[10px]">2026-06-12 08:00</td>
                    <td className="font-bold text-slate-900">BTC-PERP</td>
                    <td className="number-mono text-[#10b981]">0.0100%</td>
                    <td className="number-mono text-[#ef4444]">-$0.25 USDC</td>
                    <td className="text-emerald-500 font-semibold text-[10px]">SETTLED</td>
                  </tr>
                  <tr className="hover:bg-slate-100/30">
                    <td className="py-2.5 number-mono text-slate-400 text-[10px]">2026-06-12 04:00</td>
                    <td className="font-bold text-slate-900">ETH-PERP</td>
                    <td className="number-mono text-[#ef4444]">-0.0050%</td>
                    <td className="number-mono text-[#10b981]">+$0.08 USDC</td>
                    <td className="text-emerald-500 font-semibold text-[10px]">SETTLED</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      {/* ── COL 4: ORDER ENTRY ──────────────────────────────────────── */}
      <section className="xl:col-span-1 bg-white border border-slate-200 rounded-xl p-4 flex flex-col shadow-xl" style={{ maxHeight: 820 }}>
        {/* Order Type */}
        <div className="flex bg-slate-50 border border-slate-200 p-0.5 rounded-lg mb-4">
          {(['Market', 'Limit', 'Stop'] as const).map(t => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                orderType === t ? 'bg-sky-100 text-[#8b5cf6] border border-[#8b5cf6]/20' : 'text-slate-500 hover:text-slate-900'
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
                ? 'bg-[#10b981] text-slate-900 border-transparent shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                : 'border-slate-200 text-slate-500 hover:text-[#10b981]'
            }`}
          >Buy / Long</button>
          <button
            onClick={() => setTradeSide('SHORT')}
            className={`py-2 text-xs font-bold rounded-lg border uppercase tracking-wider transition-all ${
              tradeSide === 'SHORT'
                ? 'bg-[#ef4444] text-slate-900 border-transparent shadow-[0_0_15px_rgba(239,68,68,0.35)]'
                : 'border-slate-200 text-slate-500 hover:text-[#ef4444]'
            }`}
          >Sell / Short</button>
        </div>

        {/* Margin Mode */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-500">Margin Mode</span>
          <div className="flex bg-slate-50 border border-slate-200 p-0.5 rounded-md text-[10px]">
            {['CROSS', 'ISOLATED'].map(mode => (
              <button
                key={mode}
                onClick={() => setMarginMode(mode as any)}
                className={`px-2 py-0.5 font-bold rounded transition-colors ${
                  marginMode === mode ? 'bg-sky-100 text-[#8b5cf6] border border-[#8b5cf6]/15' : 'text-slate-400 hover:text-slate-700'
                }`}
              >{mode}</button>
            ))}
          </div>
        </div>

        {/* Price */}
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-xs text-slate-500">Price {orderType === 'Market' && <span className="text-amber-500 text-[10px] font-bold bg-amber-500/10 px-1 rounded ml-1">MARKET</span>}</span>
            <span className="text-[10px] text-slate-400 uppercase">USDC</span>
          </div>
          <input
            type="text"
            disabled={orderType === 'Market'}
            value={orderType === 'Market' ? activePair.lastPrice : inputPrice}
            onChange={e => setInputPrice(e.target.value)}
            className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs number-mono text-slate-900 outline-none transition-colors ${
              orderType === 'Market' ? 'border-slate-200 text-slate-500 cursor-not-allowed' : 'border-slate-200 focus:border-[#8b5cf6]/50'
            }`}
          />
        </div>

        {/* Amount */}
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-xs text-slate-500">Amount</span>
            <span className="text-[10px] text-slate-500 number-mono uppercase">{activePair.symbol.split('-')[0]}</span>
          </div>
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputAmount}
              onChange={e => setInputAmount(e.target.value)}
              className="w-full pl-3 pr-14 py-2 bg-slate-50 border border-slate-200 focus:border-[#8b5cf6]/50 rounded-lg text-xs number-mono text-slate-900 outline-none transition-colors"
            />
            <button
              onClick={() => {
                if (!walletConnected || balances.USDC <= 0) return;
                const maxPositionUSD = balances.USDC * leverage * 0.99; // 1% fee buffer
                const maxSize = maxPositionUSD / parsedPrice;
                setInputAmount(maxSize.toFixed(4));
              }}
              className="absolute right-2 px-2 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold text-slate-900 rounded transition-colors cursor-pointer"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Leverage Slider (Capped at 20x Max) */}
        <div className="mb-5">
          <div className="flex justify-between mb-1">
            <span className="text-xs text-slate-500 flex items-center gap-1"><Scale size={12} /> Leverage (Max 20x)</span>
            <span className="text-xs font-bold text-[#8b5cf6] number-mono">{leverage}x</span>
          </div>
          <input
            type="range" min="1" max="20" value={leverage}
            onChange={e => setLeverage(parseInt(e.target.value))}
            className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#8b5cf6]"
          />
          <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1 mb-2">
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
                    : 'bg-slate-50 text-slate-400 border border-slate-200 hover:text-slate-900 hover:border-slate-200'
                }`}
              >
                {levVal}x
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-1.5 text-xs text-slate-500 border-t border-slate-200 pt-3 mb-3">
          {[
            ['Position Value', `$${positionSize.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`],
            ['Required Margin', `$${marginRequired.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`],
            ['Effective Leverage', `${leverage}x`],
            ['Est. Liq. Price', `$${calculatedLiqPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
            ['Taker Fee (0.06%)', `$${feeEstimate.toLocaleString(undefined, { maximumFractionDigits: 4 })} USDC`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span>{label}</span>
              <span className={`number-mono ${label === 'Required Margin' ? 'text-[#01C38E] font-bold' : label === 'Effective Leverage' ? 'text-[#8b5cf6] font-bold' : 'text-slate-700'}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Available */}
        <div className="flex justify-between items-center text-[10px] bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg mb-3">
          <span className="text-slate-400">Available Margin:</span>
          <span className="number-mono font-bold text-slate-900">${balances.USDC.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC</span>
        </div>

        {/* Action */}
        {walletConnected ? (
          <button
            onClick={handlePlaceOrder}
            disabled={parsedAmount <= 0}
            className={`w-full py-3 rounded-lg text-xs font-bold text-slate-900 uppercase tracking-wider transition-all ${
              parsedAmount <= 0
                ? 'bg-sky-100 text-slate-400 border border-slate-200 cursor-not-allowed'
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
            className="w-full py-3 rounded-lg text-xs font-bold text-slate-900 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:from-[#4f8ff7] hover:to-[#996cf7] uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(59,130,246,0.35)]"
          >
            Connect Wallet
          </button>
        )}
      </section>
    </main>
  );
}
