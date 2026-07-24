'use client';

import React, { useState, useEffect } from 'react';
import { useAppState } from '@/context/useAppState';
import { ArrowUpDown, ChevronDown, Settings, Info, Zap, CircleAlert, RefreshCw, ExternalLink, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import {
  ARC_TOKENS,
  SWAP_ROUTER_ADDRESS,
  getPoolFee,
  encodeExactInputSingle,
  toWei
} from '@/lib/swapRouter';

const TOKENS = [
  { symbol: 'USDC',  name: 'USD Coin',   decimals: 2, color: '#8b5cf6' },
  { symbol: 'EURC',  name: 'Euro Coin',  decimals: 2, color: '#3b82f6' },
  { symbol: 'USDT',  name: 'Tether USD', decimals: 2, color: '#10b981' },
];

const PRICES: Record<string, number> = {
  USDC: 1.0,
  EURC: 1.085,
  USDT: 1.0,
};

function TokenSelector({
  selected,
  onChange,
  exclude,
  label,
  prices,
}: {
  selected: string;
  onChange: (s: string) => void;
  exclude: string;
  label: string;
  prices: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const token = TOKENS.find(t => t.symbol === selected)!;

  return (
    <div className="relative">
      <div className="text-[10px] text-[#6e6e7f] font-semibold uppercase mb-1.5">{label}</div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-[#181822] border border-[#1e1e2c] hover:border-[#8b5cf6]/50 px-3 py-2 rounded-xl transition-all"
      >
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white"
          style={{ backgroundColor: token.color + '33', border: `1px solid ${token.color}55` }}
        >
          {token.symbol.slice(0, 2)}
        </span>
        <span className="text-sm font-bold text-white">{token.symbol}</span>
        <ChevronDown size={14} className="text-[#8e8e9f]" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute top-full mt-2 left-0 w-52 bg-[#09090c] border border-[#13131a] rounded-xl p-1.5 shadow-2xl z-30"
          >
            {TOKENS.filter(t => t.symbol !== exclude).map(t => (
              <button
                key={t.symbol}
                onClick={() => { onChange(t.symbol); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#13131a] transition-colors text-left ${
                  t.symbol === selected ? 'bg-[#8b5cf6]/10' : ''
                }`}
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
                  style={{ backgroundColor: t.color + '33', border: `1px solid ${t.color}55` }}
                >
                  {t.symbol.slice(0, 2)}
                </span>
                <div>
                  <div className="text-xs font-bold text-white">{t.symbol}</div>
                  <div className="text-[9px] text-[#6e6e7f]">{t.name}</div>
                </div>
                <div className="ml-auto text-[10px] number-mono text-[#8e8e9f]">
                  ${(prices[t.symbol] ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SwapView() {
  const { walletConnected, walletAddress, balances, setBalances, addNotification, claimFaucet, markets } = useAppState();

  const [fromToken, setFromToken] = useState('USDC');
  const [toToken, setToToken]     = useState('EURC');
  const [fromAmount, setFromAmount] = useState('');
  const [slippage, setSlippage]     = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [recentSwaps, setRecentSwaps] = useState<{ from: string; to: string; fromAmt: number; toAmt: number; time: string }[]>([]);
  const [txModalData, setTxModalData] = useState<{ hash: string; from: string; to: string; fromAmt: number; toAmt: number } | null>(null);

  // Derive prices and 24h change from global markets state
  const prices: Record<string, number> = {
    USDC: 1.0,
    EURC: 1.085,
    USDT: 1.0,
  };
  const change24h: Record<string, number> = {
    USDC: 0.0,
    EURC: 0.15,
    USDT: 0.02,
  };

  markets.forEach(m => {
    const tokenSymbol = m.symbol.split('-')[0].toUpperCase();
    if (m.lastPrice > 0) {
      prices[tokenSymbol] = m.lastPrice;
      change24h[tokenSymbol] = m.change24h;
    }
  });

  const fromPrice = prices[fromToken] ?? 1;
  const toPrice   = prices[toToken]   ?? 1;
  const parsed    = parseFloat(fromAmount) || 0;
  const toAmount  = parsed > 0 ? (parsed * fromPrice) / toPrice : 0;
  const priceImpact = parsed * fromPrice > 5000 ? 0.12 : parsed * fromPrice > 1000 ? 0.05 : 0.01;
  const fee = parsed * fromPrice * 0.003; // 0.3%

  const fromBalance: number = (balances as any)[fromToken] ?? 0;
  const toBalance:   number = (balances as any)[toToken]   ?? 0;

  const flip = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount('');
  };

  const setMax = () => {
    setFromAmount(fromBalance.toFixed(TOKENS.find(t => t.symbol === fromToken)?.decimals ?? 2));
  };

  const handleSwap = async () => {
    if (parsed <= 0) {
      addNotification('warning', 'Invalid Amount', 'Enter an amount to swap.');
      return;
    }
    if (fromBalance > 0 && parsed > fromBalance) {
      addNotification('error', 'Insufficient Balance', `You only have ${fromBalance} ${fromToken} available.`);
      return;
    }

    setIsSwapping(true);

    const eth = (window as any).ethereum;
    let realTxHash = '';

    if (eth && walletConnected) {
      addNotification('info', 'Confirm Swap', 'Please confirm the Synthra V3 swap in your Web3 wallet...');
      try {
        const tokenIn = ARC_TOKENS[fromToken];
        const tokenOut = ARC_TOKENS[toToken];
        const userAddr = eth.selectedAddress || walletAddress;

        if (tokenIn && tokenOut) {
          const fee = getPoolFee(fromToken, toToken);
          const amountInWei = toWei(parsed, tokenIn.decimals);
          const minOutWei = toWei(toAmount * 0.99, tokenOut.decimals);

          const swapData = encodeExactInputSingle(
            tokenIn.address,
            tokenOut.address,
            fee,
            userAddr,
            amountInWei,
            minOutWei,
            BigInt(0)
          );

          realTxHash = await eth.request({
            method: 'eth_sendTransaction',
            params: [{
              from: userAddr,
              to: SWAP_ROUTER_ADDRESS,
              data: swapData
            }]
          });
        } else {
          realTxHash = await eth.request({
            method: 'eth_sendTransaction',
            params: [{
              from: userAddr,
              to: SWAP_ROUTER_ADDRESS,
              value: '0x0'
            }]
          });
        }
      } catch (err: any) {
        console.error('Swap execution error:', err);
        setIsSwapping(false);
        return;
      }
    } else {
      await new Promise(r => setTimeout(r, 600));
    }

    setIsSwapping(false);

    const received = Number(toAmount.toFixed(TOKENS.find(t => t.symbol === toToken)?.decimals ?? 4));

    // Update balances locally for instant responsive UI feedback
    if (setBalances) {
      setBalances((prev: any) => ({
        ...prev,
        [fromToken]: Math.max(0, (prev[fromToken] ?? 0) - parsed),
        [toToken]: (prev[toToken] ?? 0) + received
      }));
    }

    addNotification(
      'success',
      'Swap Executed',
      `Swapped ${parsed} ${fromToken} → ${received} ${toToken}`,
      realTxHash || undefined
    );

    if (realTxHash) {
      setTxModalData({
        hash: realTxHash,
        from: fromToken,
        to: toToken,
        fromAmt: parsed,
        toAmt: received
      });

      // Auto dismiss modal popup within 3 seconds
      setTimeout(() => {
        setTxModalData(null);
      }, 3000);
    }

    setRecentSwaps(prev => [
      { from: fromToken, to: toToken, fromAmt: parsed, toAmt: received, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 4)
    ]);
    setFromAmount('');
  };

  const toToken_ = TOKENS.find(t => t.symbol === toToken)!;
  const fromToken_ = TOKENS.find(t => t.symbol === fromToken)!;

  return (
    <main className="w-full flex-1 max-w-[1600px] mx-auto p-4 lg:p-6 flex flex-col lg:flex-row gap-6 items-start select-none">

      {/* ── LEFT: SWAP CARD ─────────────────────────────────────────── */}
      <div className="w-full max-w-[480px] mx-auto lg:mx-0 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-wide">Swap</h1>
            <p className="text-xs text-[#8e8e9f] mt-0.5">Instant token swaps on Arc Testnet</p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl border transition-all ${showSettings ? 'bg-[#8b5cf6]/15 border-[#8b5cf6]/40 text-[#8b5cf6]' : 'bg-[#09090c] border-[#13131a] text-[#8e8e9f] hover:text-white'}`}
          >
            <Settings size={16} />
          </button>
        </div>

        {/* Settings Drawer */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-[#09090c] border border-[#13131a] rounded-2xl p-4 space-y-3">
                <div className="text-xs font-bold text-white uppercase tracking-wide">Swap Settings</div>
                <div>
                  <div className="text-[10px] text-[#8e8e9f] mb-2">Max Slippage</div>
                  <div className="flex gap-2">
                    {['0.1', '0.5', '1.0'].map(s => (
                      <button
                        key={s}
                        onClick={() => setSlippage(s)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          slippage === s ? 'bg-[#8b5cf6]/20 border-[#8b5cf6]/50 text-[#8b5cf6]' : 'bg-[#0d0d12] border-[#13131a] text-[#8e8e9f]'
                        }`}
                      >
                        {s}%
                      </button>
                    ))}
                    <div className="relative flex-1">
                      <input
                        value={slippage}
                        onChange={e => setSlippage(e.target.value)}
                        className="w-full px-2 py-1.5 bg-[#0d0d12] border border-[#13131a] rounded-lg text-xs number-mono text-white outline-none focus:border-[#8b5cf6]/50"
                        placeholder="Custom %"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Swap Card */}
        <div className="bg-[#09090c] border border-[#13131a] rounded-2xl p-5 shadow-2xl space-y-2 relative">

          {/* From Box */}
          <div className="bg-[#0d0d12] border border-[#13131a] hover:border-[#1e1e2c] rounded-xl p-4 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <TokenSelector selected={fromToken} onChange={setFromToken} exclude={toToken} label="You Pay" prices={prices} />
              <div className="text-right">
                <div className="text-[10px] text-[#6e6e7f] mb-1">
                  Balance: <span className="number-mono text-[#8e8e9f]">{fromBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                </div>
                <button onClick={setMax} className="text-[9px] font-bold text-[#8b5cf6] hover:text-[#a78bfa] uppercase tracking-wider">
                  MAX
                </button>
              </div>
            </div>
            <input
              type="number"
              value={fromAmount}
              onChange={e => setFromAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent text-2xl font-black text-white placeholder-[#2a2a3a] outline-none number-mono"
            />
            <div className="text-xs text-[#6e6e7f] number-mono mt-1">
              ≈ ${(parsed * fromPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </div>
          </div>

          {/* Flip Button */}
          <div className="flex justify-center -my-1 relative z-10">
            <button
              onClick={flip}
              className="p-2.5 bg-[#09090c] border-2 border-[#13131a] hover:border-[#8b5cf6]/50 rounded-xl text-[#8e8e9f] hover:text-[#8b5cf6] transition-all hover:rotate-180 duration-300"
            >
              <ArrowUpDown size={16} />
            </button>
          </div>

          {/* To Box */}
          <div className="bg-[#0d0d12] border border-[#13131a] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <TokenSelector selected={toToken} onChange={setToToken} exclude={fromToken} label="You Receive" prices={prices} />
              <div className="text-right text-[10px] text-[#6e6e7f]">
                Balance: <span className="number-mono text-[#8e8e9f]">{toBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
              </div>
            </div>
            <div className={`text-2xl font-black number-mono ${toAmount > 0 ? 'text-[#10b981]' : 'text-[#2a2a3a]'}`}>
              {toAmount > 0 ? toAmount.toLocaleString(undefined, { maximumFractionDigits: toToken_?.decimals ?? 4 }) : '0.00'}
            </div>
            <div className="text-xs text-[#6e6e7f] number-mono mt-1">
              ≈ ${(toAmount * toPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </div>
          </div>

          {/* Swap Details */}
          {parsed > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-[#0d0d12] border border-[#13131a] rounded-xl p-3.5 space-y-2 text-xs overflow-hidden"
            >
              <div className="flex justify-between text-[#8e8e9f]">
                <span>Rate</span>
                <span className="number-mono text-white">
                  1 {fromToken} = {(fromPrice / toPrice).toLocaleString(undefined, { maximumFractionDigits: 6 })} {toToken}
                </span>
              </div>
              <div className="flex justify-between text-[#8e8e9f]">
                <span>Price Impact</span>
                <span className={`number-mono font-semibold ${priceImpact > 0.1 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                  ~{(priceImpact).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-[#8e8e9f]">
                <span>LP Fee (0.30%)</span>
                <span className="number-mono text-white">${fee.toFixed(4)} USDC</span>
              </div>
              <div className="flex justify-between text-[#8e8e9f]">
                <span>Max Slippage</span>
                <span className="number-mono text-[#8b5cf6]">{slippage}%</span>
              </div>
              <div className="h-[1px] bg-[#13131a]" />
              <div className="flex justify-between font-semibold">
                <span className="text-[#8e8e9f]">Min. Received</span>
                <span className="number-mono text-white">
                  {(toAmount * (1 - parseFloat(slippage) / 100)).toLocaleString(undefined, { maximumFractionDigits: toToken_?.decimals ?? 4 })} {toToken}
                </span>
              </div>
            </motion.div>
          )}

          {/* Action Button */}
          {walletConnected ? (
            <button
              onClick={handleSwap}
              disabled={isSwapping || parsed <= 0 || parsed > fromBalance}
              className={`w-full py-3.5 rounded-xl text-sm font-bold text-white uppercase tracking-wider transition-all duration-200 mt-1 ${
                isSwapping
                  ? 'bg-[#8b5cf6]/50 cursor-wait'
                  : parsed <= 0
                  ? 'bg-[#181822] text-[#6e6e7f] border border-[#1d1d28] cursor-not-allowed'
                  : parsed > fromBalance
                  ? 'bg-[#ef4444]/80 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:from-[#4f8ff7] hover:to-[#996cf7] shadow-[0_0_20px_rgba(139,92,246,0.3)]'
              }`}
            >
              {isSwapping ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw size={15} className="animate-spin" /> Swapping...
                </span>
              ) : parsed > fromBalance ? (
                `Insufficient ${fromToken} Balance`
              ) : parsed <= 0 ? (
                'Enter Amount'
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Zap size={15} />
                  Swap {fromToken} → {toToken}
                </span>
              )}
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-[#ef4444]/5 border border-[#ef4444]/20 text-[#ef4444] text-xs font-semibold mt-1">
              <CircleAlert size={14} className="animate-bounce shrink-0" />
              Connect wallet to swap on Arc Testnet
            </div>
          )}
        </div>

        {/* Powered by */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#6e6e7f]">
          <Zap size={11} className="text-[#8b5cf6]" />
          Powered by Arc Testnet AMM · 0.30% LP Fee
        </div>
      </div>

      {/* ── RIGHT: INFO PANELS ──────────────────────────────────────── */}
      <div className="flex-1 space-y-5">

        {/* Live Price Grid */}
        <div className="bg-[#09090c] border border-[#13131a] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#13131a]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wide">Live Token Prices</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {TOKENS.map(t => {
              const price = prices[t.symbol] ?? 0;
              const change = change24h[t.symbol] ?? 0;
              return (
                <div
                  key={t.symbol}
                  onClick={() => { setFromToken('USDC'); setToToken(t.symbol === 'USDC' ? 'ETH' : t.symbol); }}
                  className="bg-[#0d0d12] border border-[#13131a] hover:border-[#8b5cf6]/40 rounded-xl p-3 cursor-pointer transition-all hover:bg-[#13131c]/50 group"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                      style={{ backgroundColor: t.color + '33' }}
                    >
                      {t.symbol.slice(0, 2)}
                    </span>
                    <span className="text-xs font-bold text-white group-hover:text-[#8b5cf6] transition-colors">{t.symbol}</span>
                  </div>
                  <div className="text-sm font-bold text-white number-mono">
                    ${price.toLocaleString(undefined, { maximumFractionDigits: t.symbol === 'BTC' || t.symbol === 'XAU' ? 2 : 4 })}
                  </div>
                  <div className={`text-[10px] font-semibold number-mono mt-0.5 ${change >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Swaps */}
        <div className="bg-[#09090c] border border-[#13131a] rounded-2xl p-5 shadow-xl">
          <h3 className="text-xs font-bold text-white uppercase tracking-wide mb-4 pb-3 border-b border-[#13131a]">
            Your Swap History
          </h3>

          {recentSwaps.length > 0 ? (
            <div className="space-y-2">
              {recentSwaps.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-[#0d0d12] border border-[#13131a] rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{s.fromAmt} {s.from}</span>
                    <ArrowUpDown size={12} className="text-[#8b5cf6]" />
                    <span className="text-[#10b981] font-bold">{s.toAmt} {s.to}</span>
                  </div>
                  <span className="number-mono text-[#6e6e7f] text-[10px]">{s.time}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#6e6e7f] text-xs">
              <ArrowUpDown size={28} className="mx-auto mb-2 opacity-30" />
              No swaps yet. Execute your first swap above.
            </div>
          )}
        </div>

      </div>

      {/* ── TRANSACTION SUCCESS POPUP MODAL ───────────────────────── */}
      <AnimatePresence>
        {txModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTxModalData(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md rounded-2xl bg-[#09090c] border border-[#8b5cf6]/40 p-6 shadow-[0_0_50px_rgba(139,92,246,0.25)] z-10 text-center space-y-4"
            >
              <button
                onClick={() => setTxModalData(null)}
                className="absolute top-4 right-4 text-[#8e8e9f] hover:text-white transition-colors"
              >
                <X size={18} />
              </button>

              <div className="w-14 h-14 rounded-full bg-[#10b981]/15 border border-[#10b981]/40 flex items-center justify-center mx-auto text-[#10b981]">
                <CheckCircle2 size={32} />
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-white tracking-wide">Transaction Submitted</h3>
                <p className="text-xs text-[#8e8e9f] mt-1">
                  Swapped <span className="text-white font-bold">{txModalData.fromAmt} {txModalData.from}</span> → <span className="text-[#10b981] font-bold">{txModalData.toAmt} {txModalData.to}</span>
                </p>
              </div>

              <div className="bg-[#0d0d12] border border-[#13131a] p-3 rounded-xl text-left space-y-1">
                <div className="text-[10px] text-[#6e6e7f] uppercase font-bold">Transaction Hash</div>
                <div className="number-mono text-xs text-[#8b5cf6] break-all select-all font-semibold">
                  {txModalData.hash}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <a
                  href={`https://testnet.arcscan.app/tx/${txModalData.hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:from-[#4f8ff7] hover:to-[#996cf7] text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(139,92,246,0.4)]"
                >
                  View on Arc Explorer <ExternalLink size={14} />
                </a>
                <button
                  onClick={() => setTxModalData(null)}
                  className="px-4 py-3 rounded-xl bg-[#13131a] hover:bg-[#1c1c28] text-xs font-semibold text-[#8e8e9f] hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
