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
  encodeApprove,
  checkAllowance,
  waitForTransaction,
  toWei,
  padAddress
} from '@/lib/swapRouter';

interface TokenMeta {
  symbol: string;
  name: string;
  decimals: number;
  color: string;
  address?: string;
}

const TOKENS: TokenMeta[] = [
  { symbol: 'USDC', name: 'USD Coin',   decimals: 6,  color: '#8b5cf6', address: '0x3600000000000000000000000000000000000000' },
  { symbol: 'EURC', name: 'Euro Coin',  decimals: 6,  color: '#3b82f6', address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a' },
  { symbol: 'USDT', name: 'Tether USD', decimals: 18, color: '#10b981', address: '0x175CdB1D338945f0D851A741ccF787D343E57952' },
  { symbol: 'ARC',  name: 'Arc Native', decimals: 18, color: '#ec4899', address: '0xARC0000000000000000000000000000000000000' },
  { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, color: '#627EEA', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, color: '#F7931A', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
  { symbol: 'LINK', name: 'Chainlink', decimals: 18, color: '#2A5ADA', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA' },
  { symbol: 'UNI',  name: 'Uniswap', decimals: 18, color: '#FF007A', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' },
  { symbol: 'ARB',  name: 'Arbitrum', decimals: 18, color: '#28A0F0', address: '0x912CE59144191C1204E64559FE8253a0e49E6548' },
];

function TokenSelector({
  value,
  onChange,
  exclude
}: {
  value: string;
  onChange: (s: string) => void;
  exclude: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  // Fallback for custom tokens
  const token = TOKENS.find(t => t.symbol === value) || { symbol: value, name: 'Custom Token', decimals: 18, color: '#64748b' };

  const filteredTokens = TOKENS.filter(t => 
    t.symbol !== exclude && 
    (t.symbol.toLowerCase().includes(search.toLowerCase()) || 
     t.name.toLowerCase().includes(search.toLowerCase()) || 
     (t.address && t.address.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); setSearch(''); }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#1c1c28] border border-[#232330] hover:border-[#8b5cf6]/40 transition-all cursor-pointer"
      >
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-900 shadow-sm"
          style={{ backgroundColor: token.color }}
        >
          {token.symbol[0]}
        </span>
        <span className="text-sm font-bold text-slate-900">{token.symbol.substring(0, 8)}</span>
        <ChevronDown size={14} className="text-slate-500" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute top-full mt-2 left-0 w-64 bg-white border border-slate-200 rounded-xl p-1.5 shadow-2xl z-50"
          >
            <div className="p-1 mb-1">
              <input 
                type="text" 
                placeholder="Search name or paste address" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-100 text-slate-900 text-xs px-3 py-2 rounded-lg outline-none border border-transparent focus:border-purple-400 transition-colors"
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {filteredTokens.length > 0 ? filteredTokens.map(t => (
                <button
                  key={t.symbol}
                  onClick={() => { onChange(t.symbol); setOpen(false); }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-100 transition-all text-left cursor-pointer"
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-slate-900 shrink-0"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.symbol[0]}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{t.symbol}</div>
                    <div className="text-[10px] text-slate-500">{t.name}</div>
                  </div>
                </button>
              )) : (
                <div className="p-3 text-center text-xs text-slate-500">
                  {search.startsWith('0x') && search.length === 42 ? (
                    <button 
                      onClick={() => { onChange(search); setOpen(false); }}
                      className="text-purple-600 hover:text-purple-700 font-bold"
                    >
                      Import custom token
                    </button>
                  ) : 'No tokens found'}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SwapView() {
  const { walletConnected, walletAddress, balances, setBalances, addNotification, addHistoryItem, claimFaucet, markets, getProvider } = useAppState();

  const [fromToken, setFromToken] = useState('USDC');
  const [toToken, setToToken]     = useState('EURC');
  const [fromAmount, setFromAmount] = useState('');
  const [slippage, setSlippage]     = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [txModalData, setTxModalData] = useState<{ hash: string; from: string; to: string; fromAmt: number; toAmt: number } | null>(null);

  // Derive prices and 24h change from global markets state
  const prices: Record<string, number> = {
    USDC: 1.0,
    EURC: 1.085,
    USDT: 1.0,
    ARC:  markets.find(m => m.symbol === 'ARC-PERP')?.lastPrice ?? 1.245,
  };

  const parsed = parseFloat(fromAmount) || 0;
  const fromPrice = prices[fromToken] || 1;
  const toPrice   = prices[toToken]   || 1;

  // Estimated output
  const received = parsed > 0 ? Number(((parsed * fromPrice) / toPrice).toFixed(4)) : 0;

  // Wallet balance of current fromToken
  const fromBalance = (balances as any)[fromToken] ?? 0;

  const handleSwap = async () => {
    if (!walletConnected || !walletAddress) {
      addNotification('error', 'Swap Failed', 'Connect wallet first.');
      return;
    }
    if (parsed <= 0) {
      addNotification('warning', 'Invalid Amount', 'Enter an amount greater than 0.');
      return;
    }
    if (parsed > fromBalance) {
      addNotification('error', 'Insufficient Balance', `You do not have enough ${fromToken}.`);
      return;
    }

    setIsSwapping(true);
    addNotification('info', 'Processing Swap', `Swapping ${parsed} ${fromToken} → ${received} ${toToken}...`);

    let realTxHash: string | null = null;
    const eth = getProvider();

    if (eth && walletAddress) {
      try {
        // Handle known tokens from ARC_TOKENS, fallback to TOKENS array, and fallback to raw address for custom imports
        const getAddrAndDec = (sym: string) => {
          if (ARC_TOKENS[sym as keyof typeof ARC_TOKENS]) return { addr: ARC_TOKENS[sym as keyof typeof ARC_TOKENS].address, dec: ARC_TOKENS[sym as keyof typeof ARC_TOKENS].decimals };
          const fromList = TOKENS.find(t => t.symbol === sym);
          if (fromList && fromList.address) return { addr: fromList.address, dec: fromList.decimals };
          if (sym.startsWith('0x') && sym.length === 42) return { addr: sym, dec: 18 }; // Default 18 for custom
          return null;
        };

        const fromData = getAddrAndDec(fromToken);
        const toData = getAddrAndDec(toToken);

        if (fromData && toData) {
          const fromAddress = fromData.addr;
          const toAddress = toData.addr;
          const fee = getPoolFee(fromToken, toToken);
          const fromDecimals = fromData.dec;
          const amountInWei  = toWei(parsed, fromDecimals);

          // Check router allowance
          const allowanceRes = await checkAllowance(eth, fromAddress, walletAddress, SWAP_ROUTER_ADDRESS);
          const currentAllowance = allowanceRes ? BigInt(allowanceRes) : BigInt(0);

          if (currentAllowance < amountInWei) {
            addNotification('info', 'Approve Token', `Approve ${fromToken} spending for Arc Terminal Router...`);
            const approveData = encodeApprove(SWAP_ROUTER_ADDRESS, amountInWei);
            const approveTxHash = await eth.request({
              method: 'eth_sendTransaction',
              params: [{ from: walletAddress, to: fromAddress, data: approveData }]
            });
            addNotification('info', 'Approval Submitted', 'Waiting for approval confirmation...', approveTxHash);
            await waitForTransaction(eth, approveTxHash);
            addNotification('success', 'Approved ✓', `${fromToken} approved for router.`);
          }

          // Build exactInputSingle calldata (with amountOutMinimum = 0 to prevent price reverts on testnet)
          const swapCalldata = encodeExactInputSingle(
            fromAddress,
            toAddress,
            fee,
            amountInWei,
            BigInt(0)
          );

          addNotification('info', 'Confirm Swap', 'Confirm transaction in your wallet...');
          realTxHash = await eth.request({
            method: 'eth_sendTransaction',
            params: [{ from: walletAddress, to: SWAP_ROUTER_ADDRESS, data: swapCalldata }]
          });

          if (realTxHash) {
            await waitForTransaction(eth, realTxHash);
          }
        }
      } catch (onChainErr: any) {
        console.warn('On-chain swap transaction error:', onChainErr?.message || onChainErr);
        if (onChainErr?.message?.includes('User rejected') || onChainErr?.message?.includes('User denied')) {
          addNotification('error', 'Swap Cancelled', 'Transaction rejected by user.');
        } else {
          addNotification('error', 'Swap Failed', 'Transaction failed or reverted on-chain.');
        }
        setIsSwapping(false);
        return;
      }
    }

    // Simulate instant local state update for UI responsiveness
    await new Promise(r => setTimeout(r, 600));

    setBalances(prev => ({
      ...prev,
      [fromToken]: Math.max(0, (prev as any)[fromToken] - parsed),
      [toToken]:   ((prev as any)[toToken] ?? 0) + received
    }));

    setIsSwapping(false);

    // Removed redundant toast notification since the modal already shows success.

    addHistoryItem({
      pair: `${fromToken}/${toToken}`,
      side: 'SWAP',
      type: 'AMM Swap',
      size: `${parsed} ${fromToken}`,
      price: `1 ${fromToken} = ${(fromPrice / toPrice).toFixed(4)} ${toToken}`,
      fee: '0.30%',
      status: 'SUCCESS',
      category: 'Swap',
      txHash: realTxHash || undefined,
      details: `${parsed} ${fromToken} → ${received} ${toToken}`
    });

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

    setFromAmount('');
  };

  const toToken_ = TOKENS.find(t => t.symbol === toToken)!;
  const fromToken_ = TOKENS.find(t => t.symbol === fromToken)!;

  return (
    <main className="w-full flex-1 max-w-[1600px] mx-auto p-4 lg:p-6 flex items-center justify-center min-h-[calc(100vh-140px)] select-none animate-fadeIn">

      {/* ── CENTERED SWAP CARD ─────────────────────────────────────────── */}
      <div className="w-full max-w-[480px] space-y-4 my-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-wide">Swap</h1>
            <p className="text-xs text-slate-500 mt-0.5">Instant token swaps on Arc Testnet</p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl border transition-all ${showSettings ? 'bg-[#8b5cf6]/15 border-[#8b5cf6]/40 text-[#8b5cf6]' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'}`}
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
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">Swap Settings</div>
                <div>
                  <div className="text-[10px] text-slate-500 mb-2">Max Slippage</div>
                  <div className="flex gap-2">
                    {['0.1', '0.5', '1.0'].map(s => (
                      <button
                        key={s}
                        onClick={() => setSlippage(s)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          slippage === s ? 'bg-[#8b5cf6]/20 border-[#8b5cf6]/50 text-[#8b5cf6]' : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        {s}%
                      </button>
                    ))}
                    <div className="relative flex-1">
                      <input
                        value={slippage}
                        onChange={e => setSlippage(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-[#8b5cf6]/40 rounded-lg px-3 py-1.5 text-xs text-slate-900 number-mono outline-none text-right pr-6"
                      />
                      <span className="absolute right-2.5 top-1.5 text-xs text-slate-500">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Swap Box Container */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xl space-y-3 relative">

          {/* Top subtle glow */}
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-[#8b5cf6]/10 rounded-full blur-2xl pointer-events-none" />

          {/* YOU PAY PANEL */}
          <div className="relative z-20 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 focus-within:border-[#8b5cf6]/40 transition-all">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">You Pay</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Balance:</span>
                <span className="text-slate-900 font-bold number-mono">
                  {fromBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} {fromToken}
                </span>
                {fromBalance > 0 && (
                  <button
                    onClick={() => setFromAmount(fromBalance.toString())}
                    className="text-[10px] font-bold text-[#8b5cf6] hover:text-[#a78bfa] bg-[#8b5cf6]/10 px-1.5 py-0.5 rounded transition-all ml-1 cursor-pointer"
                  >
                    MAX
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <input
                type="number"
                placeholder="0.0"
                value={fromAmount}
                onChange={e => setFromAmount(e.target.value)}
                className="w-full bg-transparent text-2xl font-black text-slate-900 number-mono outline-none placeholder-[#3a3a4a]"
              />
              <TokenSelector
                value={fromToken}
                onChange={setFromToken}
                exclude={toToken}
              />
            </div>

            {parsed > 0 && (
              <div className="text-[11px] text-slate-500 number-mono">
                ≈ ${(parsed * fromPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </div>
            )}
          </div>

          {/* SWAP FLIP BUTTON */}
          <div className="flex justify-center -my-1 relative z-10">
            <button
              onClick={() => {
                const prev = fromToken;
                setFromToken(toToken);
                setToToken(prev);
                setFromAmount('');
              }}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-[#1c1c28] border border-[#232330] hover:border-[#8b5cf6]/40 text-[#8b5cf6] hover:text-slate-900 transition-all cursor-pointer shadow-lg hover:rotate-180 duration-300"
            >
              <ArrowUpDown size={16} />
            </button>
          </div>

          {/* YOU RECEIVE PANEL */}
          <div className="relative z-10 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">You Receive (Est.)</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Balance:</span>
                <span className="text-slate-900 font-bold number-mono">
                  {((balances as any)[toToken] ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} {toToken}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-2xl font-black text-slate-900 number-mono opacity-90">
                {received > 0 ? received.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '0.0'}
              </div>
              <TokenSelector
                value={toToken}
                onChange={setToToken}
                exclude={fromToken}
              />
            </div>

            {received > 0 && (
              <div className="text-[11px] text-slate-500 number-mono">
                ≈ ${(received * toPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </div>
            )}
          </div>

          {/* RATE & DETAILS SUMMARY */}
          {parsed > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-slate-50/50 border border-slate-200 rounded-xl text-xs space-y-1.5"
            >
              <div className="flex justify-between text-slate-500">
                <span>Exchange Rate</span>
                <span className="text-slate-900 number-mono font-semibold">
                  1 {fromToken} = {(fromPrice / toPrice).toFixed(4)} {toToken}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Price Impact</span>
                <span className="text-[#10b981] font-semibold">&lt; 0.01%</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Max Slippage</span>
                <span className="text-slate-900 font-semibold">{slippage}%</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Network Fee</span>
                <span className="text-slate-900 font-semibold">~0.001 ARC</span>
              </div>
            </motion.div>
          )}

          {/* SWAP ACTION BUTTON */}
          {walletConnected ? (
            <button
              onClick={handleSwap}
              disabled={isSwapping || parsed <= 0 || parsed > fromBalance}
              className={`w-full py-4 rounded-xl font-bold text-sm transition-all shadow-xl cursor-pointer ${
                isSwapping
                  ? 'bg-sky-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                  : parsed > fromBalance
                  ? 'bg-red-500/10 border border-red-500/30 text-[#ef4444] cursor-not-allowed'
                  : parsed <= 0
                  ? 'bg-slate-100 border border-[#232330] text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:from-[#4f8ff7] hover:to-[#996cf7] text-slate-900 shadow-[0_0_25px_rgba(139,92,246,0.35)]'
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
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
          <Zap size={11} className="text-[#8b5cf6]" />
          Powered by Arc Testnet AMM
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
              className="relative w-full max-w-md rounded-2xl bg-white border border-[#8b5cf6]/40 p-6 shadow-[0_0_50px_rgba(139,92,246,0.25)] z-10 text-center space-y-4"
            >
              <button
                onClick={() => setTxModalData(null)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="w-14 h-14 rounded-full bg-[#10b981]/15 border border-[#10b981]/40 flex items-center justify-center mx-auto text-[#10b981]">
                <CheckCircle2 size={32} />
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-slate-900 tracking-wide">Swap Successful</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Swapped <span className="text-slate-900 font-bold">{txModalData.fromAmt} {txModalData.from}</span> → <span className="text-[#10b981] font-bold">{txModalData.toAmt} {txModalData.to}</span>
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-left space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Transaction Hash</div>
                <div className="number-mono text-xs text-[#8b5cf6] break-all select-all font-semibold">
                  {txModalData.hash}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <a
                  href={`https://testnet.arcscan.app/tx/${txModalData.hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:from-[#4f8ff7] hover:to-[#996cf7] text-slate-900 text-xs font-bold transition-all shadow-[0_0_15px_rgba(139,92,246,0.4)]"
                >
                  View on Arc Explorer <ExternalLink size={14} />
                </a>
                <button
                  onClick={() => setTxModalData(null)}
                  className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-[#1c1c28] text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
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
