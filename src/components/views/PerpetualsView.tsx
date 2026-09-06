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
  const [inputSize, setInputSize] = useState<string>('1.0');
  const [activeBottomTab, setActiveBottomTab] = useState<'Positions' | 'OpenOrders' | 'TradeHistory'>('Positions');
  const [activeOrderbookTab, setActiveOrderbookTab] = useState<'OrderBook'|'RecentTrades'>('OrderBook');
  const [showLeverageDropdown, setShowLeverageDropdown] = useState(false);
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
  const parsedSize = parseFloat(inputSize) || 0;
  const positionSize = parsedSize * (orderType === 'Market' ? activePair.lastPrice : parsedPrice);
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
      parsedSize
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
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);

  return (
    <main className="w-full mx-auto p-1 flex flex-col gap-1 pt-[72px] min-h-screen bg-slate-50 dark:bg-[#08080a] text-slate-900 dark:text-white">
      {/* --- TICKER TAPE (EdgeX Style) --- */}
      <div className="bg-[#08080a] shrink-0 flex items-center overflow-x-auto no-scrollbar h-[36px] px-4 gap-6 text-xs font-semibold border-b border-[#1f1f2e]">
        <div className="text-slate-500 dark:text-[#8a8a9e] whitespace-nowrap">Favorites</div>
        {markets.slice(0, 10).map((m) => {
          const isUp = m.change24h >= 0;
          const isActive = activePair.symbol === m.symbol;
          return (
            <div key={m.symbol} className={`flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${isActive ? 'text-white' : 'text-slate-400 hover:text-white'}`} onClick={() => setActivePairBySymbol(m.symbol)}>
              <span>{m.symbol.replace('-', '')}</span>
              {isActive && <span className={isUp ? 'text-[#10b981]' : 'text-[#ef4444]'}>{isUp ? '+' : ''}{m.change24h}%</span>}
            </div>
          );
        })}
      </div>

      {/* --- TOP HEADER (Binance Style) --- */}
      <div className="bg-white dark:bg-[#121216] border border-slate-200 dark:border-[#1e1e24] flex items-center justify-between px-4 py-2 shrink-0">
        <div className="flex items-center gap-6">
          {/* Market Dropdown Toggle */}
          <div className="relative">
            <button 
              onClick={() => setShowMarketDropdown(!showMarketDropdown)}
              className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white hover:text-[#e5c07b] transition-colors"
            >
              {activePair.symbol}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div className="text-[10px] text-slate-500 dark:text-[#8a8a9e] mt-0.5">{activePair.name}</div>
            
            {/* Dropdown Menu */}
            {showMarketDropdown && (
              <div className="absolute top-full left-0 mt-2 w-[350px] bg-slate-100 dark:bg-[#18181c] border border-slate-200 dark:border-[#1e1e24] rounded-lg shadow-2xl z-50 overflow-hidden">
                <div className="p-2 border-b border-slate-200 dark:border-[#1e1e24]">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 text-slate-500 dark:text-[#8a8a9e]" size={14} />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#121216] border border-slate-200 dark:border-[#1e1e24] rounded focus:border-[#e5c07b] text-xs text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div className="flex gap-1 mt-2">
                    {(['All', 'Crypto', 'Commodities', 'Forex'] as const).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`flex-1 py-1 text-[10px] font-bold rounded ${
                          categoryFilter === cat ? 'bg-[#e5c07b]/20 text-[#e5c07b]' : 'text-slate-500 dark:text-[#8a8a9e] hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-[#1f1f2e]'
                        }`}
                      >{cat}</button>
                    ))}
                  </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {filteredPairs.map(m => (
                    <div
                      key={m.symbol}
                      onClick={() => { setActivePairBySymbol(m.symbol); setShowMarketDropdown(false); }}
                      className="flex items-center justify-between p-2 hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-[#1f1f2e] cursor-pointer border-b border-slate-200 dark:border-[#1e1e24]/50"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{m.symbol}</div>
                        <div className="text-[10px] text-slate-500 dark:text-[#8a8a9e]">{m.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs number-mono text-slate-900 dark:text-white">{m.lastPrice.toLocaleString()}</div>
                        <div className={`text-[10px] font-bold ${m.change24h >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                          {m.change24h >= 0 ? '+' : ''}{m.change24h}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="h-8 w-px bg-slate-200 dark:bg-[#1f1f2e]" />
          
          <div className="flex gap-8">
            <div>
              <div className={`text-xl font-black number-mono ${activePair.change24h >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {activePair.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className={`text-[11px] font-bold ${activePair.change24h >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {activePair.change24h >= 0 ? '+' : ''}{activePair.change24h}%
              </div>
            </div>
            {[
              { label: 'Index Price', value: (activePair.lastPrice * 1.0001).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
              { label: 'Mark Price',  value: activePair.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
              { label: '24h Vol',  value: `$${(activePair.volume24h / 1e6).toFixed(2)}M` },
              { label: 'Open Interest', value: `$${(activePair.openInterest / 1e6).toFixed(2)}M` },
              { label: 'Funding / 1h', value: '0.0051%' },
            ].map(stat => (
              <div key={stat.label}>
                <div className={`text-sm number-mono font-semibold ${stat.color || 'text-slate-900 dark:text-white'}`}>{stat.value}</div>
                <div className="text-[10px] text-slate-500 dark:text-[#8a8a9e] uppercase">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- MAIN 3-PANEL GRID --- */}
      <div className="flex w-full gap-1 h-[calc(100vh-120px)] shrink-0">
        
        {/* LEFT COLUMN: Chart + Positions */}
        <div className="flex-[3.5] flex flex-col gap-1 min-w-0">
          {/* Chart Section */}
          <div className="flex-1 bg-white dark:bg-[#121216] border border-slate-200 dark:border-[#1e1e24] min-h-[400px] flex flex-col">
            <div className="flex items-center gap-2 p-2 border-b border-slate-200 dark:border-[#1e1e24]">
              <div className="flex items-center gap-4 text-xs font-bold px-2">
                <button className="text-[#e5c07b] border-b-2 border-[#e5c07b] pb-1">Chart</button>
                <button className="text-slate-500 dark:text-[#8a8a9e] hover:text-slate-900 dark:text-white pb-1">Info</button>
              </div>
              <div className="h-4 w-px bg-slate-200 dark:bg-[#1f1f2e]" />
              <div className="flex items-center gap-1">
                {['1m', '5m', '15m', '1h', '4h', '1D'].map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      timeframe === tf ? 'bg-slate-200 dark:bg-[#1f1f2e] text-slate-900 dark:text-white' : 'text-slate-500 dark:text-[#8a8a9e] hover:text-slate-900 dark:text-white'
                    }`}
                  >{tf}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 w-full h-full relative" id="tv_chart_container">
              <TradingViewChart symbol={activePair.symbol} timeframe={timeframe} />
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Orderbook (Visual Mockup for Pro layout) */}
        <div className="w-[280px] bg-white dark:bg-[#121216] border border-slate-200 dark:border-[#1e1e24] flex flex-col shrink-0">
          <div className="flex items-center gap-4 px-3 pt-2 border-b border-slate-200 dark:border-[#1e1e24]">
            <button onClick={() => setActiveOrderbookTab('OrderBook')} className={`text-xs font-semibold border-b-2 py-1 transition-colors ${activeOrderbookTab === 'OrderBook' ? 'border-[#e5c07b] text-[#e5c07b]' : 'border-transparent text-slate-500 dark:text-[#8a8a9e] hover:text-slate-900 dark:text-white'}`}>Order Book</button>
            <button onClick={() => setActiveOrderbookTab('RecentTrades')} className={`text-xs font-semibold border-b-2 py-1 transition-colors ${activeOrderbookTab === 'RecentTrades' ? 'border-[#e5c07b] text-[#e5c07b]' : 'border-transparent text-slate-500 dark:text-[#8a8a9e] hover:text-slate-900 dark:text-white'}`}>Recent Trades</button>
          </div>
          <div className="grid grid-cols-3 text-[10px] font-bold text-slate-500 dark:text-[#8a8a9e] px-3 py-2 uppercase">
            <span>Price</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Total</span>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col relative text-[11px] number-mono">
            {/* Asks (Red) */}
            <div className="flex-1 flex flex-col-reverse overflow-hidden px-1">
              {[...Array(12)].map((_, i) => (
                <div key={`ask-${i}`} className="grid grid-cols-3 px-2 py-0.5 relative hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-[#1f1f2e]">
                   <div className="absolute top-0 right-0 h-full bg-[#ef4444]/10" style={{ width: `${Math.random() * 80 + 10}%` }} />
                   <span className="text-[#ef4444] relative z-10">{(activePair.lastPrice * (1 + (12-i)*0.0001)).toFixed(2)}</span>
                   <span className="text-slate-900 dark:text-white text-right relative z-10">{(Math.random() * 2).toFixed(3)}</span>
                   <span className="text-slate-500 dark:text-[#8a8a9e] text-right relative z-10">{(Math.random() * 10).toFixed(3)}</span>
                </div>
              ))}
            </div>
            
            {/* Spread / Mark Price */}
            <div className="flex items-center gap-2 py-2 px-3 my-1 bg-slate-200 dark:bg-[#1f1f2e]/50 border-y border-slate-200 dark:border-[#1e1e24]">
               <span className={`text-lg font-black ${activePair.change24h >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                 {activePair.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
               </span>
            </div>

            {/* Bids (Green) */}
            <div className="flex-1 overflow-hidden px-1">
              {[...Array(12)].map((_, i) => (
                <div key={`bid-${i}`} className="grid grid-cols-3 px-2 py-0.5 relative hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-[#1f1f2e]">
                   <div className="absolute top-0 right-0 h-full bg-[#10b981]/10" style={{ width: `${Math.random() * 80 + 10}%` }} />
                   <span className="text-[#10b981] relative z-10">{(activePair.lastPrice * (1 - (i+1)*0.0001)).toFixed(2)}</span>
                   <span className="text-slate-900 dark:text-white text-right relative z-10">{(Math.random() * 2).toFixed(3)}</span>
                   <span className="text-slate-500 dark:text-[#8a8a9e] text-right relative z-10">{(Math.random() * 10).toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Order Entry */}
        <div className="w-[320px] bg-[#121216] border-l border-[#1e1e24] flex flex-col overflow-y-auto shrink-0 p-3">
          
          {/* Top Tabs */}
          <div className="flex gap-4 border-b border-[#1e1e24] mb-3 pb-0">
            {(['Market', 'Limit', 'Stop Limit'] as const).map(t => (
              <button
                key={t}
                onClick={() => setOrderType(t as any)}
                className={`pb-2 text-xs font-bold border-b-2 transition-all ${
                  orderType === t ? 'border-[#e5c07b] text-white' : 'border-transparent text-slate-500 hover:text-white'
                }`}
              >{t}</button>
            ))}
          </div>

          {/* Avbl Balance */}
          <div className="flex justify-between items-center text-xs font-semibold mb-3 px-1">
            <span className="text-slate-500">Avbl <span className="text-white">{Math.max(0, balances.vaultUSDC - positions.reduce((acc, pos) => acc + pos.margin, 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT</span></span>
            <div className="flex items-center gap-2">
              <button className="text-[#e5c07b] hover:text-white transition-colors" title="Deposit" onClick={() => depositFunds(100)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg></button>
              <button className="text-[#e5c07b] hover:text-white transition-colors" title="Withdraw" onClick={() => withdrawFunds(100)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg></button>
            </div>
          </div>

          {/* Cross | 20x | M Button Group */}
          <div className="flex gap-1 mb-4">
            <button onClick={() => setMarginMode(marginMode === 'CROSS' ? 'ISOLATED' : 'CROSS')} className="flex-1 py-1.5 bg-[#18181c] hover:bg-[#1f1f26] border border-[#1e1e24] rounded-sm text-[10px] font-semibold text-slate-300 transition-colors uppercase">
              {marginMode === 'CROSS' ? 'Cross' : 'Isolated'}
            </button>
            <div className="relative flex-1">
              <button onClick={() => setShowLeverageDropdown(!showLeverageDropdown)} className="w-full h-full py-1.5 bg-[#18181c] hover:bg-[#1f1f26] border border-[#1e1e24] rounded-sm text-[10px] font-semibold text-slate-300 transition-colors">
                {leverage}x
              </button>
              {showLeverageDropdown && (
                <div className="absolute top-full right-0 mt-1 w-[200px] bg-[#18181c] border border-[#1e1e24] rounded-lg shadow-2xl z-[100] p-4">
                  <div className="flex justify-between text-xs font-bold mb-3 text-white">
                    <span>Leverage</span>
                    <span className="text-[#e5c07b]">{leverage}x</span>
                  </div>
                  <input type="range" min="1" max="100" value={leverage} onChange={(e) => setLeverage(parseInt(e.target.value))} className="w-full accent-[#e5c07b] mb-4" />
                  <button onClick={() => setShowLeverageDropdown(false)} className="w-full py-1.5 bg-[#e5c07b] text-slate-900 text-xs font-bold rounded hover:bg-[#d4ae6a]">Confirm</button>
                </div>
              )}
            </div>
            <button className="w-10 py-1.5 bg-[#18181c] hover:bg-[#1f1f26] border border-[#1e1e24] rounded-sm text-[10px] font-semibold text-slate-300 transition-colors">M</button>
          </div>
          <div className="space-y-3 mb-4">
            <div className="relative">
              <label className="absolute left-3 top-2 text-[10px] font-bold text-slate-500 dark:text-[#8a8a9e] uppercase">Price</label>
              <input
                type="text"
                value={orderType === 'Market' ? 'Market' : inputPrice}
                onChange={e => orderType !== 'Market' && setInputPrice(e.target.value)}
                disabled={orderType === 'Market'}
                className="w-full pl-[50px] pr-12 py-2 bg-slate-100 dark:bg-[#18181c] border border-slate-200 dark:border-[#1e1e24] rounded focus:border-[#e5c07b] text-sm text-slate-900 dark:text-white number-mono outline-none disabled:opacity-50"
              />
              <span className="absolute right-3 top-2 text-xs font-bold text-slate-500 dark:text-[#8a8a9e]">USDC</span>
            </div>

            <div className="relative">
              <label className="absolute left-3 top-2 text-[10px] font-bold text-slate-500 dark:text-[#8a8a9e] uppercase">Size</label>
              <input
                type="text"
                value={inputSize}
                onChange={e => setInputSize(e.target.value)}
                className="w-full pl-[60px] pr-16 py-2 bg-slate-100 dark:bg-[#18181c] border border-slate-200 dark:border-[#1e1e24] rounded focus:border-[#e5c07b] text-sm text-slate-900 dark:text-white number-mono outline-none"
              />
              <span className="absolute right-3 top-2 text-xs font-bold text-slate-500 dark:text-[#8a8a9e]">{activePair.symbol.split('-')[0]}</span>
            </div>

            <div className="py-2">
               <input 
                 type="range" 
                 min="1" 
                 max="100" 
                 className="w-full accent-[#e5c07b]"
                 onChange={(e) => {
                   const pct = parseInt(e.target.value);
                   // Mock up slide to set amount based on balance
                   if (balances.vaultUSDC > 0 && leverage > 0) {
                     const maxPos = balances.vaultUSDC * leverage;
                     const targetPos = maxPos * (pct / 100);
                     setInputSize((targetPos / activePair.lastPrice).toFixed(4));
                   }
                 }}
               />
               <div className="flex justify-between text-[9px] text-slate-500 dark:text-[#8a8a9e] mt-1 font-bold">
                 <span>0%</span>
                 <span>25%</span>
                 <span>50%</span>
                 <span>75%</span>
                 <span>100%</span>
               </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-[#8a8a9e] cursor-pointer">
              <input type="checkbox" checked={showTPSL} onChange={e => setShowTPSL(e.target.checked)} className="accent-[#e5c07b] bg-slate-100 dark:bg-[#18181c] border-slate-200 dark:border-[#1e1e24] rounded-sm" />
              TP/SL
            </label>

            {showTPSL && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input type="text" placeholder="Take Profit" className="w-full px-2 py-1.5 bg-slate-100 dark:bg-[#18181c] border border-slate-200 dark:border-[#1e1e24] rounded text-xs text-slate-900 dark:text-white number-mono outline-none focus:border-[#e5c07b]" />
                <input type="text" placeholder="Stop Loss" className="w-full px-2 py-1.5 bg-slate-100 dark:bg-[#18181c] border border-slate-200 dark:border-[#1e1e24] rounded text-xs text-slate-900 dark:text-white number-mono outline-none focus:border-[#e5c07b]" />
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-500 dark:text-[#8a8a9e] font-bold space-y-2 mb-4 bg-slate-100 dark:bg-[#18181c] p-3 rounded border border-slate-200 dark:border-[#1e1e24]">
            <div className="flex justify-between">
              <span>Required Margin</span>
              <span className="text-slate-900 dark:text-white number-mono">${marginRequired.toFixed(2)} USDC</span>
            </div>
            <div className="flex justify-between">
              <span>Est. Liq Price</span>
              <span className="text-[#f59e0b] number-mono">${calculatedLiqPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span>Taker / Maker Fee</span>
              <span className="text-slate-900 dark:text-white number-mono">0.06% / 0.02%</span>
            </div>
            <div className="flex justify-between">
              <span>Est. Fee</span>
              <span className="text-slate-900 dark:text-white number-mono">${feeEstimate.toFixed(2)} USDC</span>
            </div>
          </div>

          {!walletConnected ? (
            <button
              onClick={() => connectWallet('injected')}
              className="w-full py-3 rounded text-sm font-bold bg-[#e5c07b] hover:bg-[#d4ae6a] text-slate-900 dark:text-white transition-colors"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => { setTradeSide('LONG'); handlePlaceOrder(); }}
                className="flex-1 py-3 rounded text-sm font-bold bg-[#10b981] hover:bg-[#059669] text-slate-900 dark:text-white transition-colors shadow-lg shadow-[#10b981]/20 flex flex-col items-center justify-center leading-tight"
              >
                <span>Buy / Long</span>
              </button>
              <button
                onClick={() => { setTradeSide('SHORT'); handlePlaceOrder(); }}
                className="flex-1 py-3 rounded text-sm font-bold bg-[#ef4444] hover:bg-[#dc2626] text-slate-900 dark:text-white transition-colors shadow-lg shadow-[#ef4444]/20 flex flex-col items-center justify-center leading-tight"
              >
                <span>Sell / Short</span>
              </button>
            </div>
          )}
        </div>
      </div>



      {/* PnL Share Modal */}
      {sharePosition && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm relative flex flex-col items-center">
            
            {/* The Downloadable Card */}
            <div 
              ref={shareCardRef}
              className="bg-slate-50 dark:bg-[#08080a] border border-[#1f2937] rounded-3xl w-full overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] relative mb-6"
            >
              {/* Premium Glow Effects */}
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b ${sharePosition.unrealizedPnl >= 0 ? 'from-[#10b981]/15' : 'from-[#ef4444]/15'} to-transparent opacity-70 pointer-events-none`} />
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-white dark:bg-[#121216]/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-white dark:bg-[#121216]/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="p-8 text-center relative z-10">
                <div className="flex items-center justify-center gap-2 mb-6 opacity-80">
                  <div className="w-6 h-6 rounded bg-gradient-to-tr from-[#34d399] to-[#059669] flex items-center justify-center shadow-lg shadow-[#10b981]/30">
                    <span className="text-slate-900 dark:text-white text-[10px] font-black">A</span>
                  </div>
                  <div className="text-[11px] font-black text-slate-900 dark:text-white tracking-[0.2em] uppercase">Arc Terminal AI</div>
                </div>
                
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className={`px-2.5 py-0.5 rounded-sm text-[10px] font-black tracking-widest ${sharePosition.side === 'LONG' ? 'bg-[#10b981] text-black shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-[#ef4444] text-slate-900 dark:text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}>{sharePosition.side}</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white tracking-wide">{sharePosition.symbol}</span>
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-white dark:bg-[#121216]/10 px-1.5 py-0.5 rounded">{Number(sharePosition.leverage).toLocaleString(undefined, { maximumFractionDigits: 2 })}x</span>
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
                    <div className="text-sm font-black text-slate-900 dark:text-white number-mono">${sharePosition.entryPrice.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 dark:text-[#8a8a9e] font-bold tracking-widest uppercase mb-0.5">Mark Price</div>
                    <div className="text-sm font-black text-slate-900 dark:text-white number-mono">${sharePosition.markPrice.toLocaleString()}</div>
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
              <button onClick={handleDownloadImage} className="flex-[2] py-3 rounded-xl text-xs font-bold text-slate-900 dark:text-white bg-gradient-to-r from-[#3b82f6] to-[#e5c07b] hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(139,92,246,0.3)] border border-white/10">Download Image</button>
            </div>
            
          </div>
        </div>
      )}
      {/* TP / SL Modal */}
      {tpSlPosition && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#121216] border border-slate-200 dark:border-[#1e1e24] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <div className="p-5 border-b border-slate-100 dark:border-[#1e1e24] flex justify-between items-center bg-slate-50 dark:bg-[#0c0c10]">
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
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c0c10] border border-slate-200 dark:border-[#1e1e24] focus:border-[#10b981]/50 focus:ring-2 focus:ring-[#10b981]/20 rounded-lg text-sm font-bold number-mono text-slate-900 dark:text-white outline-none transition-all"
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
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c0c10] border border-slate-200 dark:border-[#1e1e24] focus:border-[#ef4444]/50 focus:ring-2 focus:ring-[#ef4444]/20 rounded-lg text-sm font-bold number-mono text-slate-900 dark:text-white outline-none transition-all"
                  />
                  {estimatedSLPnl !== null && (
                    <div className={`mt-1.5 text-[10px] font-bold ${estimatedSLPnl >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                      Est. PnL: {estimatedSLPnl >= 0 ? '+' : ''}${estimatedSLPnl.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-[#0c0c10] border-t border-slate-100 dark:border-[#1e1e24] flex gap-3">
              <button onClick={() => setTpSlPosition(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#121216] border border-slate-200 dark:border-[#1e1e24] hover:bg-slate-50 dark:hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-[#1f1f2e] transition-colors">Cancel</button>
              <button onClick={() => {
                if (tpPrice || slPrice) {
                  const tp = tpPrice ? parseFloat(tpPrice) : 0;
                  const sl = slPrice ? parseFloat(slPrice) : 0;
                  setTPSL(tpSlPosition.symbol, tp, sl);
                }
                setTpPrice('');
                setSlPrice('');
                setTpSlPosition(null);
              }} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-900 dark:text-white bg-[#e5c07b] hover:bg-[#d4ae6a] transition-colors shadow-lg shadow-[#e5c07b]/30">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Close Modal */}
      {closingPosition && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#121216] border border-slate-200 dark:border-[#1e1e24] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <div className="p-5 border-b border-slate-100 dark:border-[#1e1e24] flex justify-between items-center bg-slate-50 dark:bg-[#0c0c10]">
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
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">Size to Close</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={closeSizeInput}
                      onChange={e => setCloseSizeInput(e.target.value)}
                      className="w-full pl-3 pr-16 py-2 bg-slate-50 dark:bg-[#0c0c10] border border-slate-200 dark:border-[#1e1e24] focus:border-[#e5c07b]/50 focus:ring-2 focus:ring-[#e5c07b]/20 rounded-lg text-sm font-bold number-mono text-slate-900 dark:text-white outline-none transition-all"
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
            <div className="p-4 bg-slate-50 dark:bg-[#0c0c10] border-t border-slate-100 dark:border-[#1e1e24] flex gap-3">
              <button onClick={() => setClosingPosition(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#121216] border border-slate-200 dark:border-[#1e1e24] hover:bg-slate-50 dark:hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-[#1f1f2e] transition-colors">Cancel</button>
              <button onClick={() => {
                const amt = parseFloat(closeSizeInput);
                if (!isNaN(amt) && amt > 0) {
                  closePosition(closingPosition.id, amt);
                }
                setClosingPosition(null);
              }} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-900 dark:text-white bg-[#ef4444] hover:bg-[#dc2626] transition-colors shadow-lg shadow-[#ef4444]/30">Confirm Close</button>
            </div>
          </div>
        </div>
      )}
    
      {/* FULL WIDTH POSITIONS (EdgeX Style) */}


          {/* Positions Section */}
          <div className="w-full shrink-0 min-h-[300px] bg-white dark:bg-[#121216] border-t border-slate-200 dark:border-[#1e1e24] flex flex-col mt-1">
            <div className="flex items-center gap-4 px-4 pt-2 border-b border-slate-200 dark:border-[#1e1e24]">
              {[
                { id: 'Positions',     label: 'Positions',     count: positions.length },
                { id: 'OpenOrders',    label: 'Open Orders',   count: openOrders.length },
                { id: 'TradeHistory',  label: 'Trade History', count: null },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveBottomTab(tab.id as any)}
                  className={`py-2 text-xs font-semibold border-b-2 transition-all ${
                    activeBottomTab === tab.id
                      ? 'border-[#e5c07b] text-[#e5c07b]'
                      : 'border-transparent text-slate-500 dark:text-[#8a8a9e] hover:text-slate-900 dark:text-white'
                  }`}
                >
                  {tab.label} {tab.count !== null && `(${tab.count})`}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-auto">
              {activeBottomTab === 'Positions' && (
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="sticky top-0 bg-white dark:bg-[#121216] z-10">
                    <tr className="text-slate-500 dark:text-[#8a8a9e] font-bold uppercase text-[10px]">
                      <th className="py-2 pl-4 font-medium">Market</th>
                      <th className="font-medium">Size</th>
                      <th className="font-medium">Entry Price</th>
                      <th className="font-medium">Mark Price</th>
                      <th className="font-medium">Liq. Price</th>
                      <th className="font-medium">Unrealized PnL</th>
                      <th className="font-medium text-right pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#1f1f2e]">
                    {positions.map(pos => {
                      const isGain = pos.unrealizedPnl >= 0;
                      return (
                        <tr key={pos.id} className="hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-[#1f1f2e]/50 transition-colors">
                          <td className="py-2 pl-4">
                            <div className="font-bold text-slate-900 dark:text-white">{pos.symbol}</div>
                            <div className={`text-[9px] font-bold ${pos.side === 'LONG' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                              {pos.side} {Number(pos.leverage).toLocaleString(undefined, { maximumFractionDigits: 2 })}x
                            </div>
                          </td>
                          <td className="number-mono text-slate-900 dark:text-white">{pos.size}</td>
                          <td className="number-mono text-slate-700 dark:text-slate-300">${pos.entryPrice.toLocaleString()}</td>
                          <td className="number-mono text-slate-700 dark:text-slate-300">${pos.markPrice.toLocaleString()}</td>
                          <td className="number-mono text-[#f59e0b]">${pos.liqPrice.toLocaleString()}</td>
                          <td className={`number-mono font-bold ${isGain ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                            {isGain ? '+' : ''}${pos.unrealizedPnl.toFixed(2)}
                          </td>
                          <td className="text-right pr-4 flex items-center justify-end gap-1 pt-2">
                            <button onClick={() => setTpSlPosition(pos)} className="px-2 py-1 text-[10px] font-bold text-slate-500 dark:text-[#8a8a9e] hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-[#1f1f2e] border border-slate-200 dark:border-[#1e1e24] rounded transition-all" title="Set TP/SL">TP/SL</button>
                            <button onClick={() => setSharePosition(pos)} className="p-1 text-[#e5c07b] hover:bg-[#e5c07b]/10 border border-[#e5c07b]/30 rounded transition-all" title="Share PnL">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                            </button>
                            <button onClick={async () => {
                              await closePosition(pos.id);
                              await new Promise(r => setTimeout(r, 8000));
                              await placeOrder(pos.side === 'LONG' ? 'SHORT' : 'LONG', 'MARKET', pos.markPrice, pos.size, pos.symbol, false, true);
                            }} className="px-2 py-1 text-[10px] font-semibold text-[#f59e0b] hover:bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded transition-all" title="Reverse Position">Reverse</button>
                            <button onClick={() => {
                              setClosingPosition(pos);
                              setCloseSizeInput(pos.size.toString());
                            }} className="px-2 py-1 text-[10px] font-semibold text-[#ef4444] hover:bg-[#ef4444]/10 border border-[#ef4444]/30 rounded transition-all">Close</button>
                          </td>
                        </tr>
                      );
                    })}
                    {positions.length === 0 && (
                      <tr><td colSpan={7} className="text-center text-slate-500 dark:text-[#8a8a9e] py-8 text-xs">No open positions</td></tr>
                    )}
                  </tbody>
                </table>
              )}
              {activeBottomTab === 'OpenOrders' && (
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="sticky top-0 bg-white dark:bg-[#121216] z-10">
                    <tr className="text-slate-500 dark:text-[#8a8a9e] font-bold uppercase text-[10px]">
                      <th className="py-2 pl-4 font-medium">Market</th>
                      <th className="font-medium">Type</th>
                      <th className="font-medium">Price</th>
                      <th className="font-medium">Size</th>
                      <th className="font-medium text-right pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#1f1f2e]">
                    {openOrders.map(order => (
                      <tr key={order.id} className="hover:bg-slate-200 dark:hover:bg-[#1f1f2e]/50 transition-colors">
                        <td className="py-2 pl-4">
                          <div className="font-bold text-slate-900 dark:text-white">{order.symbol}</div>
                          <div className={`text-[9px] font-bold ${order.side === 'BUY' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                            {order.side === 'BUY' ? 'LONG' : 'SHORT'} {Number(order.leverage).toLocaleString(undefined, { maximumFractionDigits: 2 })}x
                          </div>
                        </td>
                        <td className="text-slate-700 dark:text-slate-300">{order.type === 'TPSL' ? 'TP/SL' : order.type}</td>
                        <td className="number-mono text-slate-700 dark:text-slate-300">
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
                        <td className="text-right pr-4 py-1.5 flex items-center justify-end">
                          <button onClick={() => cancelOrder(order.id)} className="px-2 py-1 text-[10px] font-bold text-[#ef4444] border border-[#ef4444]/30 bg-[#ef4444]/10 rounded hover:bg-[#ef4444]/20 transition-all">Cancel</button>
                        </td>
                      </tr>
                    ))}
                    {openOrders.length === 0 && <tr><td colSpan={5} className="text-center text-slate-500 dark:text-[#8a8a9e] py-8 text-xs">No open orders</td></tr>}
                  </tbody>
                </table>
              )}
              {activeBottomTab === 'TradeHistory' && (
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="sticky top-0 bg-white dark:bg-[#121216] z-10">
                    <tr className="text-slate-500 dark:text-[#8a8a9e] font-bold uppercase text-[10px]">
                      <th className="py-2 pl-4 font-medium">Time</th>
                      <th className="font-medium">Market</th>
                      <th className="font-medium">Action</th>
                      <th className="font-medium">Price</th>
                      <th className="font-medium text-right pr-4">PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#1f1f2e]">
                    {history.map(item => (
                      <tr key={item.id} className="hover:bg-slate-200 dark:hover:bg-[#1f1f2e]/50 transition-colors">
                        <td className="py-2 pl-4 text-slate-500 dark:text-[#8a8a9e]">{new Date(item.timestamp).toLocaleString()}</td>
                        <td className="font-bold text-slate-900 dark:text-white">{item.symbol}</td>
                        <td className={`font-bold ${item.action.includes('Buy') || item.action.includes('Long') ? 'text-[#10b981]' : item.action.includes('Sell') || item.action.includes('Short') ? 'text-[#ef4444]' : 'text-slate-500 dark:text-[#8a8a9e]'}`}>{item.action}</td>
                        <td className="number-mono text-slate-700 dark:text-slate-300">{item.price ? `$${item.price.toLocaleString()}` : '-'}</td>
                        <td className={`text-right pr-4 font-bold number-mono ${item.realizedPnl && item.realizedPnl > 0 ? 'text-[#10b981]' : item.realizedPnl && item.realizedPnl < 0 ? 'text-[#ef4444]' : 'text-slate-500 dark:text-[#8a8a9e]'}`}>
                          {item.realizedPnl ? `${item.realizedPnl > 0 ? '+' : ''}$${item.realizedPnl.toFixed(2)}` : '-'}
                        </td>
                      </tr>
                    ))}
                    {history.length === 0 && <tr><td colSpan={5} className="text-center text-slate-500 dark:text-[#8a8a9e] py-8 text-xs">No trade history</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
          </div>
      {/* Margin Modal */}
      {marginAction && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#121216] border border-slate-200 dark:border-[#1e1e24] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <div className="p-5 border-b border-slate-100 dark:border-[#1e1e24] flex justify-between items-center bg-slate-50 dark:bg-[#0c0c10]">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">{marginAction === 'deposit' ? 'Deposit Margin' : 'Withdraw Margin'}</h3>
              <button onClick={() => setMarginAction(null)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-black text-slate-800 dark:text-slate-100">USDC Vault</span>
                <span className="text-xs font-bold text-slate-500 dark:text-[#8a8a9e]">Available: {marginAction === 'deposit' ? balances.walletUSDC.toLocaleString() : balances.vaultUSDC.toLocaleString()}</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">Amount</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={marginAmount}
                      onChange={e => setMarginAmount(e.target.value)}
                      className="w-full pl-3 pr-16 py-2 bg-slate-50 dark:bg-[#0c0c10] border border-slate-200 dark:border-[#1e1e24] focus:border-[#e5c07b]/50 focus:ring-2 focus:ring-[#e5c07b]/20 rounded-lg text-sm font-bold number-mono text-slate-900 dark:text-white outline-none transition-all"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button onClick={() => setMarginAmount((marginAction === 'deposit' ? balances.walletUSDC : balances.vaultUSDC).toString())} className="px-2 py-1 bg-[#1e1e24] text-[#e5c07b] rounded text-[10px] font-bold">MAX</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-[#0c0c10] border-t border-slate-100 dark:border-[#1e1e24] flex gap-3">
              <button onClick={() => setMarginAction(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#121216] border border-slate-200 dark:border-[#1e1e24] hover:bg-slate-50 dark:hover:bg-[#1f1f2e] transition-colors">Cancel</button>
              <button onClick={() => {
                const amt = parseFloat(marginAmount);
                if (!isNaN(amt) && amt > 0) {
                  if (marginAction === 'deposit') depositFunds(amt);
                  else withdrawFunds(amt);
                }
                setMarginAction(null);
              }} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-900 bg-[#e5c07b] hover:bg-[#d4ae6a] transition-colors shadow-lg shadow-[#e5c07b]/30">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}