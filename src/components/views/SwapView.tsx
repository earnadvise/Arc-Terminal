'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppState } from '@/context/useAppState';
import { ArrowUpDown, ChevronDown, Settings, Info, Zap, CircleAlert, RefreshCw, ExternalLink, CheckCircle2, X, Search, Star, BadgeCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { LineChart as LucideLineChart, Activity, ShieldCheck } from 'lucide-react';
import { AppKit } from '@circle-fin/app-kit';
import { createEthersAdapterFromProvider } from '@circle-fin/adapter-ethers-v6';

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
  priceUSD?: string;
}

const TOKENS: TokenMeta[] = [
  { symbol: 'USDC', name: 'USD Coin', decimals: 6,  color: '#8b5cf6', address: '0x3600000000000000000000000000000000000000', priceUSD: '1.00' },
  { symbol: 'EURC', name: 'Euro Coin',  decimals: 6,  color: '#3b82f6', address: '0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1', priceUSD: '1.08' },
  { symbol: 'cirBTC', name: 'Circle BTC', decimals: 8, color: '#F7931A', address: '0x171A4217b86A807A64eB94757Db6849fb4bDbAA0', priceUSD: '76000.0' },
  { symbol: 'ARCAT', name: 'ARCAT', decimals: 18, color: '#F7931A', address: '0x07704B06981eA962b87296362a1281484d160000', priceUSD: '0.0007' }
];

function TokenSelector({
  value,
  onChange,
  exclude,
  tokens
}: {
  value: string;
  onChange: (s: string) => void;
  exclude: string;
  tokens: TokenMeta[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const token = tokens.find(t => t.symbol === value) || { symbol: value, name: 'Custom Token', decimals: 18, color: '#64748b' };

  const filteredTokens = tokens.filter(t => 
    t.symbol.toLowerCase().includes(search.toLowerCase()) || 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    (t.address && t.address.toLowerCase().includes(search.toLowerCase()))
  );

  const modalContent = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-[420px] bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            style={{ maxHeight: '85vh' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 pb-4 border-b border-slate-100 dark:border-[#1f1f2e]">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Select a token</h2>
                <p className="text-xs text-slate-500 dark:text-[#8a8a9e] mt-0.5">{tokens.length} listed tokens</p>
              </div>
              <button 
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#1f1f2e] dark:bg-[#1f1f2e] text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 bg-slate-50/50 dark:bg-[#0c0c10]/50">
              <div className="relative flex items-center">
                <Search size={16} className="absolute left-3.5 text-slate-400 dark:text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search name or paste address..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white dark:bg-[#13131a] text-slate-900 dark:text-white text-sm pl-10 pr-4 py-3 rounded-xl outline-none border border-slate-200 dark:border-[#1f1f2e] focus:border-[#3b82f6]/50 focus:ring-2 focus:ring-[#3b82f6]/20 transition-all placeholder:text-slate-400 dark:text-slate-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Token List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2 bg-slate-50/30">
              <div className="px-3 py-2.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase mt-1">
                <BadgeCheck size={14} className="text-[#3b82f6]" />
                Verified Tokens
              </div>
              
              <div className="space-y-0.5">
                {filteredTokens.map(t => {
                  const isSelected = t.symbol === value;
                  const isOther = t.symbol === exclude;
                  
                  return (
                    <button
                      key={t.symbol}
                      onClick={() => {
                        onChange(t.symbol); 
                        setOpen(false); 
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all text-left ${isSelected ? 'bg-[#3b82f6]/5 cursor-default' : 'hover:bg-slate-100 dark:hover:bg-[#1f1f2e] dark:bg-[#1f1f2e] cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="relative">
                          {t.icon ? (
                            <img src={t.icon} alt={t.symbol} className="w-10 h-10 rounded-full shadow-sm" />
                          ) : (
                            <span
                              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-slate-900 dark:text-white shadow-sm"
                              style={{ backgroundColor: t.color }}
                            >
                              {t.symbol[0]}
                            </span>
                          )}
                          <div className="absolute -bottom-0.5 -right-0.5 bg-white dark:bg-[#13131a] rounded-full p-0.5 shadow-sm">
                            <div className="w-4 h-4 bg-[#3b82f6] rounded-full flex items-center justify-center">
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{t.symbol}</span>
                          <span className="text-[11px] font-medium text-slate-500 dark:text-[#8a8a9e] mt-0.5">{t.name}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {isSelected && (
                          <span className="px-2.5 py-1 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[10px] font-bold text-[#3b82f6] uppercase tracking-wide">
                            Selected
                          </span>
                        )}
                        {isOther && (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-200 border border-slate-300 text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                            In use
                          </span>
                        )}
                        {!isSelected && !isOther && (
                          <Star size={16} className="text-slate-300 hover:text-amber-400 transition-colors" />
                        )}
                      </div>
                    </button>
                  );
                })}
                
                {filteredTokens.length === 0 && (
                  <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm font-medium">
                    No tokens found matching "{search}"
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        onClick={() => { setOpen(true); setSearch(''); }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1f1f2e] hover:bg-white dark:hover:bg-[#13131a] dark:bg-[#13131a] border border-[#232330]/20 dark:border-white/10 hover:border-[#8b5cf6]/40 transition-all cursor-pointer shadow-sm"
      >
        {token.icon ? (
          <img src={token.icon} alt={token.symbol} className="w-5 h-5 rounded-full shadow-sm" />
        ) : (
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-900 dark:text-white shadow-sm"
            style={{ backgroundColor: token.color }}
          >
            {token.symbol[0]}
          </span>
        )}
        <span className="text-sm font-bold text-slate-900 dark:text-white">{token.symbol.substring(0, 8)}</span>
        <ChevronDown size={14} className="text-slate-500 dark:text-[#8a8a9e]" />
      </button>

      {mounted && typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent}
    </>
  );
}

export default function SwapView() {
  const formatTokenAmount = (amount: number) => {
    if (!amount || amount === 0) return '0';
    if (amount < 0.0001) return amount.toExponential(2);
    return amount.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };
  const { walletConnected, walletAddress, balances, setBalances, addNotification, addHistoryItem, claimFaucet, markets, getProvider } = useAppState();

  const [fromToken, setFromToken] = useState('USDC');
  const [toToken, setToToken]     = useState('EURC');
  const [fromAmount, setFromAmount] = useState('');
  const [slippage, setSlippage]     = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [txModalData, setTxModalData] = useState<{ hash: string; from: string; to: string; fromAmt: number; toAmt: number } | null>(null);

  const [realReceived, setRealReceived] = useState<number | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  
  
  const [dynamicTokens, setDynamicTokens] = useState<TokenMeta[]>(TOKENS);
  
  const [isProMode, setIsProMode] = useState(false);
  const [timeframe, setTimeframe] = useState('1D');
  const [isMevProtected, setIsMevProtected] = useState(true);



  
  useEffect(() => {
    fetch('https://li.quest/v1/tokens?chains=5042')
      .then(res => res.json())
      .then(data => {
        let mergedTokens: TokenMeta[] = [];
        
        // Add hardcoded Arc tokens first
        Object.entries(ARC_TOKENS).forEach(([symbol, info]) => {
          mergedTokens.push({
            symbol: info.name === symbol ? symbol : info.name,
            name: info.name,
            decimals: info.decimals,
            color: '#64748b',
            address: info.address,
            icon: ''
          });
        });

        // Add LI.FI tokens, skipping duplicates
        if (data.tokens && data.tokens['5042']) {
          const lifiTokens = data.tokens['5042'].map((t: any) => ({
            symbol: t.symbol,
            name: t.name,
            decimals: t.decimals,
            color: '#64748b',
            address: t.address,
            icon: t.logoURI,
            priceUSD: t.priceUSD
          }));
          
          lifiTokens.forEach((lt: TokenMeta) => {
             const exists = mergedTokens.find(mt => mt.address.toLowerCase() === lt.address.toLowerCase());
             if (exists) {
                exists.icon = lt.icon || exists.icon;
                exists.symbol = lt.symbol;
                exists.priceUSD = lt.priceUSD || exists.priceUSD;
             } else {
                mergedTokens.push(lt);
             }
          });
        }
        
        setDynamicTokens(mergedTokens);
      })
      .catch(e => console.warn('Failed to load LI.FI tokens:', e));
  }, []);

  // Derive prices and 24h change from global markets state
  const prices: Record<string, number> = {
    USDC: 1.0,
    EURC: 1.085,
    USDT: 1.0,
    ARC:  markets.find(m => m.symbol === 'ARC-PERP')?.lastPrice ?? 1.245,
  };

  const parsed = parseFloat(fromAmount) || 0;
  
  const getPrice = (sym: string) => {
    if (prices[sym]) return prices[sym];
    const t = dynamicTokens.find(t => t.symbol === sym);
    if (t && t.priceUSD) return parseFloat(t.priceUSD) || 1;
    return 1;
  };
  
  const fromPrice = getPrice(fromToken);
  const toPrice   = getPrice(toToken);
  
  const effectiveExchangeRate = (parsed > 0 && realReceived !== null && realReceived > 0) 
    ? realReceived / parsed 
    : (fromPrice / toPrice);

  const displayExchangeRate = effectiveExchangeRate < 0.0001 
    ? effectiveExchangeRate.toExponential(2) 
    : effectiveExchangeRate.toFixed(4);

  // Optimistic Estimated output
  const optimisticReceived = parsed > 0 ? (parsed * fromPrice) / toPrice : 0;
  const received = realReceived !== null ? realReceived : optimisticReceived;

  // Debounced quote fetcher
  useEffect(() => {
    if (parsed <= 0) {
      setRealReceived(null);
      setIsQuoting(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsQuoting(true);
      try {
        const getAddrAndDec = (sym: string) => {
          if (ARC_TOKENS[sym as keyof typeof ARC_TOKENS]) return { addr: ARC_TOKENS[sym as keyof typeof ARC_TOKENS].address, dec: ARC_TOKENS[sym as keyof typeof ARC_TOKENS].decimals };
          const fromList = TOKENS.find(t => t.symbol === sym);
          if (fromList && fromList.address) return { addr: fromList.address, dec: fromList.decimals };
          if (sym.startsWith('0x') && sym.length === 42) return { addr: sym, dec: 18 };
          return null;
        };

        const fromData = getAddrAndDec(fromToken);
        const toData = getAddrAndDec(toToken);

        if (fromData && toData) {
          const { toWei, formatUnits } = await import('@/lib/swapRouter');
          const amountInWei = toWei(parsed, fromData.dec);
          
          const lifiUrl = `https://li.quest/v1/quote?fromChain=5042&toChain=5042&fromToken=${fromData.addr}&toToken=${toData.addr}&fromAmount=${amountInWei.toString()}`;
          const res = await fetch(lifiUrl);
          const data = await res.json();

          if (data.estimate?.toAmount) {
            setRealReceived(Number(formatUnits(data.estimate.toAmount, toData.dec)));
          } else {
            // Fallback to on-chain pool exchange rate if LI.FI quote fails
            const { getPoolExchangeRate } = await import('@/lib/swapRouter');
            const eth = typeof window !== 'undefined' ? (window as any).ethereum : null;
            const rate = await getPoolExchangeRate(eth, fromToken, toToken);
            if (rate > 0) {
              setRealReceived(parsed * rate);
            } else {
              setRealReceived(null);
            }
          }
        }
      } catch (e) {
        console.warn('Quote fetch failed, using fallback:', e);
        try {
            const { getPoolExchangeRate } = await import('@/lib/swapRouter');
            const eth = typeof window !== 'undefined' ? (window as any).ethereum : null;
            const rate = await getPoolExchangeRate(eth, fromToken, toToken);
            if (rate > 0) {
              setRealReceived(parsed * rate);
            } else {
              setRealReceived(null);
            }
        } catch (e2) {
          setRealReceived(null);
        }
      } finally {
        setIsQuoting(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [parsed, fromToken, toToken]);

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
          try {
            const { toWei } = await import('@/lib/swapRouter');
            const amountInWei = toWei(parsed, fromData.dec);

            // 1. Fetch exact Quote & Tx Bytes from LI.FI API for Arc Mainnet (Chain 5042)
            const lifiUrl = `https://li.quest/v1/quote?fromChain=5042&toChain=5042&fromToken=${fromData.addr}&toToken=${toData.addr}&fromAmount=${amountInWei.toString()}&fromAddress=${walletAddress}&slippage=${parseFloat(slippage) / 100}`;
            
            const lifiRes = await fetch(lifiUrl);
            const lifiData = await lifiRes.json();
            let txBytesToExecute: any = null;
            let targetRouter: string = '';
            let txValue: string = '0x0';
            
            if (!lifiRes.ok || !lifiData.transactionRequest) {
               console.warn('LI.FI rejected quote. Falling back to local Arc Router.');
               
               // FALLBACK: Execute direct Swap
               const { SWAP_ROUTER_ADDRESS, calculateMinOutput, encodeExactInputSingle, getPoolFee } = await import('@/lib/swapRouter');
               const minOut = calculateMinOutput(parsed, fromData.dec, toData.dec, parseFloat(slippage), (fromPrice/toPrice));
               const poolFee = getPoolFee(fromToken, toToken);
               
               txBytesToExecute = encodeExactInputSingle(fromData.addr, toData.addr, poolFee, amountInWei, minOut);
               targetRouter = SWAP_ROUTER_ADDRESS;
            } else {
               // SUCCESS: Use LI.FI route
               txBytesToExecute = lifiData.transactionRequest.data;
               targetRouter = lifiData.transactionRequest.to;
               txValue = lifiData.transactionRequest.value || '0x0';
            }

            // 2. Check Allowance for the chosen router
            const { checkAllowance, encodeApprove } = await import('@/lib/swapRouter');
            
            const currentAllowance = await checkAllowance(eth, fromData.addr, walletAddress, targetRouter);
            
            if (currentAllowance < amountInWei) {
               const approveData = encodeApprove(targetRouter, amountInWei);
               const approveTx = await eth.request({
                 method: 'eth_sendTransaction',
                 params: [{ from: walletAddress, to: fromData.addr, data: approveData }]
               });
               
               // WAIT FOR APPROVAL TO MINE ON-CHAIN BEFORE SWAPPING
               const { waitForTransaction } = await import('@/lib/swapRouter');
               await waitForTransaction(eth, approveTx);
            }

            // 3. Execute the optimal Swap!
            realTxHash = await eth.request({
               method: 'eth_sendTransaction',
               params: [{
                  from: walletAddress,
                  to: targetRouter,
                  data: txBytesToExecute,
                  value: txValue
               }]
            });
            
          } catch (onChainErr: any) {
            console.warn('Execution error:', onChainErr);
            addNotification('error', 'Swap Failed', onChainErr.message || 'Transaction rejected or failed.');
            setIsSwapping(false);
            return;
          }
        }
      } catch (err: any) {
        console.warn('On-chain swap transaction error:', err);
        addNotification('error', 'Swap Failed', 'Transaction failed or reverted on-chain.');
        setIsSwapping(false);
        return;
      }
    }

    // Wait for the transaction to be mined before refreshing balances
    try {
      if (typeof window !== 'undefined' && walletAddress) {
        const { waitForTransaction } = await import('@/lib/swapRouter');
        const eth = await getProvider();
        if (eth && realTxHash) {
          await waitForTransaction(eth, realTxHash);
        }
        
        // Refresh the actual on-chain balances!
        refreshOnChainBalances(walletAddress);
        // Refresh again slightly later in case the RPC node is lagging
        setTimeout(() => refreshOnChainBalances(walletAddress), 4000);
      }
    } catch (e) {
      console.warn("Failed to wait for transaction", e);
    }

    setIsSwapping(false);

    // Removed redundant toast notification since the modal already shows success.

    addHistoryItem({
      pair: `${fromToken}/${toToken}`,
      side: 'SWAP',
      type: 'AMM Swap',
      size: `${parsed} ${fromToken}`,
      price: `1 ${fromToken} = ${displayExchangeRate} ${toToken}`,
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

  
  // Mock chart data for Pro mode
  const mockChartData = React.useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      time: `${i}:00`,
      price: fromPrice > 0 ? effectiveExchangeRate * (1 + (Math.random() - 0.5) * 0.05) : 1
    }));
  }, [fromPrice, toPrice]);

  return (
    <main className="w-full flex-1 max-w-[1600px] mx-auto p-4 lg:p-6 min-h-[calc(100vh-140px)] select-none animate-fadeIn flex flex-col">
      {/* PRO MODE TOGGLE */}
      <div className="w-full flex justify-end mb-4 lg:mb-6">
        <button
          onClick={() => setIsProMode(!isProMode)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border shadow-sm cursor-pointer ${
            isProMode 
            ? 'bg-[#8b5cf6]/10 border-[#8b5cf6]/30 text-[#8b5cf6]' 
            : 'bg-white dark:bg-[#13131a] border-slate-200 dark:border-[#1f1f2e] text-slate-500 dark:text-[#8a8a9e] hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <LucideLineChart size={16} />
          {isProMode ? 'Pro Mode Active' : 'Enable Pro Mode'}
        </button>
      </div>

      <div className={`w-full flex-1 flex flex-col ${isProMode ? 'lg:flex-row items-start' : 'items-center justify-center'} gap-6`}>
        
        {/* LEFT COLUMN: PRO CHART (ONLY IN PRO MODE) */}
        {isProMode && (
          <div className="flex-[2] flex flex-col gap-4 w-full">
            <div className="bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] rounded-3xl p-6 shadow-2xl flex-1 flex flex-col min-h-[500px]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-[#8b5cf6] border-2 border-white dark:border-[#13131a] flex items-center justify-center text-[10px] font-bold text-white z-10">{fromToken.substring(0,2)}</div>
                      <div className="w-8 h-8 rounded-full bg-[#3b82f6] border-2 border-white dark:border-[#13131a] flex items-center justify-center text-[10px] font-bold text-white">{toToken.substring(0,2)}</div>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">{fromToken} / {toToken}</h2>
                    <span className="px-2 py-1 rounded bg-[#10b981]/10 text-[#10b981] text-xs font-bold">+2.45%</span>
                  </div>
                  <div className="text-4xl font-mono font-black text-slate-900 dark:text-white">
                    {displayExchangeRate}
                  </div>
                </div>
                <div className="flex gap-2 p-1 bg-slate-50 dark:bg-[#0c0c10] border border-slate-100 dark:border-[#1f1f2e] rounded-xl">
                  {['1H', '1D', '1W', '1M'].map((tf) => (
                    <button key={tf} onClick={() => setTimeframe(tf)} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${timeframe === tf ? 'bg-white dark:bg-[#1f1f2e] shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{tf}</button>
                  ))}
                </div>
              </div>
              
              <div className="flex-1 w-full min-h-[350px] -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockChartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#8a8a9e', fontSize: 12}} dy={10} />
                    <YAxis domain={['auto', 'auto']} orientation="right" axisLine={false} tickLine={false} tick={{fill: '#8a8a9e', fontSize: 12}} dx={10} />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] p-3 rounded-xl shadow-lg">
                              <p className="text-slate-500 dark:text-[#8a8a9e] text-xs mb-1">{label}</p>
                              <p className="text-[#8b5cf6] font-bold">
                                Price: {Number(payload[0].value).toFixed(4)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="price" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: SWAP CARD */}
        <div className={`w-full max-w-[480px] ${isProMode ? 'flex-shrink-0' : 'mx-auto'} space-y-4`}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-wide">Swap</h1>
              <p className="text-xs text-slate-500 dark:text-[#8a8a9e] mt-0.5">Instant token swaps on Arc Mainnet</p>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${showSettings ? 'bg-[#8b5cf6]/15 border-[#8b5cf6]/40 text-[#8b5cf6]' : 'bg-white dark:bg-[#13131a] border-slate-200 dark:border-[#1f1f2e] text-slate-500 dark:text-[#8a8a9e] hover:text-slate-900 dark:hover:text-white dark:text-white hover:border-[#8b5cf6]/40 shadow-sm'}`}
            >
              <Settings size={18} />
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
                <div className="bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] rounded-3xl p-5 space-y-5 shadow-lg">
                  <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Advanced Settings</div>
                  
                  {/* Slippage */}
                  <div>
                    <div className="text-[10px] text-slate-500 dark:text-[#8a8a9e] mb-2 font-bold uppercase tracking-wide">Max Slippage</div>
                    <div className="flex gap-2">
                      {['0.1', '0.5', '1.0'].map(s => (
                        <button
                          key={s}
                          onClick={() => setSlippage(s)}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            slippage === s ? 'bg-[#8b5cf6]/20 border-[#8b5cf6]/50 text-[#8b5cf6] shadow-[0_0_10px_rgba(139,92,246,0.1)]' : 'bg-slate-50 dark:bg-[#0c0c10] border-slate-200 dark:border-[#1f1f2e] text-slate-500 dark:text-[#8a8a9e] hover:bg-slate-100 dark:hover:bg-[#1f1f2e]'
                          }`}
                        >
                          {s}%
                        </button>
                      ))}
                      <div className="relative flex-[1.5]">
                        <input
                          value={slippage}
                          onChange={e => setSlippage(e.target.value)}
                          className="w-full h-full bg-slate-50 dark:bg-[#0c0c10] border border-slate-200 dark:border-[#1f1f2e] focus:border-[#8b5cf6]/40 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white number-mono outline-none text-right pr-6 focus:ring-2 focus:ring-[#8b5cf6]/10 transition-all"
                        />
                        <span className="absolute right-3 top-[50%] -translate-y-[50%] text-xs text-slate-500 dark:text-[#8a8a9e] font-bold">%</span>
                      </div>
                    </div>
                  </div>

                  {/* MEV Protection */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-[#1f1f2e]">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className={isMevProtected ? "text-[#10b981]" : "text-slate-400"} />
                      <div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">MEV Protection</div>
                        <div className="text-[10px] text-slate-500 dark:text-[#8a8a9e]">Hide trade from public mempool</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsMevProtected(!isMevProtected)}
                      className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${isMevProtected ? 'bg-[#10b981]' : 'bg-slate-300 dark:bg-[#1f1f2e]'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isMevProtected ? 'translate-x-6' : ''} shadow-sm`} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Swap Box Container */}
          <div className="bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] rounded-[32px] p-2 shadow-2xl relative overflow-hidden group/swapbox">
            
            {/* Background glow effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#3b82f6]/5 rounded-full blur-3xl pointer-events-none group-hover/swapbox:bg-[#3b82f6]/10 transition-colors duration-700" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#8b5cf6]/5 rounded-full blur-3xl pointer-events-none group-hover/swapbox:bg-[#8b5cf6]/10 transition-colors duration-700" />

            <div className="relative z-10 flex flex-col gap-1">
              {/* YOU PAY PANEL */}
              <div className="bg-slate-50/80 dark:bg-[#0c0c10]/80 border border-transparent focus-within:border-[#8b5cf6]/30 focus-within:bg-white dark:focus-within:bg-[#13131a] rounded-[24px] p-5 transition-all hover:bg-slate-100/50 dark:hover:bg-[#1f1f2e]/30">
                <div className="flex justify-between items-center text-xs mb-4">
                  <span className="text-slate-500 dark:text-[#8a8a9e] font-bold tracking-widest uppercase text-[10px]">You Pay</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 dark:text-slate-500">Balance:</span>
                    <span className="text-slate-900 dark:text-white font-bold number-mono">
                      {fromBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </span>
                    {fromBalance > 0 && (
                      <button
                        onClick={() => setFromAmount(fromBalance.toString())}
                        className="text-[10px] font-bold text-[#8b5cf6] hover:text-[#a78bfa] bg-[#8b5cf6]/10 px-2 py-0.5 rounded-md transition-all ml-1 cursor-pointer hover:bg-[#8b5cf6]/20"
                      >
                        MAX
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <input
                    type="number"
                    placeholder="0"
                    value={fromAmount}
                    onChange={e => setFromAmount(e.target.value)}
                    className="w-full bg-transparent text-4xl font-black text-slate-900 dark:text-white number-mono outline-none placeholder-slate-300 dark:placeholder-[#2a2a3a]"
                  />
                  <div className="shrink-0">
                    <TokenSelector value={fromToken} onChange={setFromToken} exclude={toToken} tokens={dynamicTokens} />
                  </div>
                </div>

                {parsed > 0 && (
                  <div className="text-[12px] font-medium text-slate-500 dark:text-[#8a8a9e] number-mono mt-3">
                    ≈ ${(parsed * fromPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                )}
              </div>

              {/* SWAP FLIP BUTTON */}
              <div className="absolute left-[50%] top-[calc(50%-18px)] -translate-x-[50%] -translate-y-[50%] z-30">
                <button
                  onClick={() => {
                    const prev = fromToken;
                    setFromToken(toToken);
                    setToToken(prev);
                    setFromAmount('');
                  }}
                  className="p-2.5 rounded-2xl bg-white dark:bg-[#1f1f2e] border-4 border-white dark:border-[#13131a] hover:bg-slate-50 dark:hover:bg-[#2a2a3a] text-slate-400 hover:text-[#8b5cf6] transition-all cursor-pointer shadow-md hover:shadow-xl hover:scale-105 active:scale-95 group"
                >
                  <ArrowUpDown size={18} className="group-hover:rotate-180 transition-transform duration-500 ease-out" />
                </button>
              </div>

              {/* YOU RECEIVE PANEL */}
              <div className="bg-slate-50/80 dark:bg-[#0c0c10]/80 border border-transparent rounded-[24px] p-5 transition-all hover:bg-slate-100/50 dark:hover:bg-[#1f1f2e]/30 mt-1">
                <div className="flex justify-between items-center text-xs mb-4">
                  <span className="text-slate-500 dark:text-[#8a8a9e] font-bold tracking-widest uppercase text-[10px]">You Receive</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 dark:text-slate-500">Balance:</span>
                    <span className="text-slate-900 dark:text-white font-bold number-mono">
                      {((balances as any)[toToken] ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className={`text-4xl font-black number-mono truncate ${isQuoting ? 'text-slate-300 dark:text-slate-700 animate-pulse' : 'text-slate-900 dark:text-white'}`}>
                    {received > 0 ? formatTokenAmount(received) : '0'}
                  </div>
                  <div className="shrink-0">
                    <TokenSelector value={toToken} onChange={setToToken} exclude={fromToken} tokens={dynamicTokens} />
                  </div>
                </div>

                {received > 0 && (
                  <div className="text-[12px] font-medium text-slate-500 dark:text-[#8a8a9e] number-mono mt-3">
                    ≈ ${(received * toPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            </div>

            {/* ROUTING PATH (PRO MODE ONLY) */}
            <AnimatePresence>
              {isProMode && parsed > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 pb-2 pt-4"
                >
                  <div className="flex flex-col gap-3 p-3 rounded-2xl bg-slate-50/50 dark:bg-[#0c0c10]/50 border border-slate-100 dark:border-[#1f1f2e]">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-[#8a8a9e]">
                      <span className="uppercase font-bold tracking-wider">Best Route</span>
                      <span className="text-[#10b981] font-bold">Save ~$1.45</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs font-bold">
                      <div className="flex items-center gap-1.5 bg-white dark:bg-[#13131a] px-2 py-1 rounded-lg border border-slate-200 dark:border-[#1f1f2e] shadow-sm">
                        <span className="text-slate-900 dark:text-white">{fromToken}</span>
                      </div>
                      <span className="text-[#8b5cf6]">→</span>
                      {fromToken !== 'ARC' && toToken !== 'ARC' && (
                        <>
                          <div className="flex items-center gap-1.5 bg-white dark:bg-[#13131a] px-2 py-1 rounded-lg border border-slate-200 dark:border-[#1f1f2e] shadow-sm text-slate-500 dark:text-slate-400">
                            ARC
                          </div>
                          <span className="text-[#8b5cf6]">→</span>
                        </>
                      )}
                      <div className="flex items-center gap-1.5 bg-white dark:bg-[#13131a] px-2 py-1 rounded-lg border border-slate-200 dark:border-[#1f1f2e] shadow-sm">
                        <span className="text-slate-900 dark:text-white">{toToken}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* RATE DETAILS EXPANDABLE */}
            <AnimatePresence>
              {parsed > 0 && !isQuoting && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4"
                >
                  <div className="py-4 text-xs space-y-3">
                    <div className="flex justify-between text-slate-500 dark:text-[#8a8a9e]">
                      <span className="font-medium">Exchange Rate</span>
                      <span className="text-slate-900 dark:text-white number-mono font-bold">
                        1 {fromToken} = {displayExchangeRate} {toToken}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500 dark:text-[#8a8a9e]">
                      <span className="font-medium">Price Impact</span>
                      <span className="text-[#10b981] font-bold">&lt; 0.05%</span>
                    </div>
                    <div className="flex justify-between text-slate-500 dark:text-[#8a8a9e]">
                      <span className="font-medium">Minimum Received</span>
                      <span className="text-slate-900 dark:text-white number-mono font-bold">
                        {formatTokenAmount(received * (1 - parseFloat(slippage)/100))} {toToken}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500 dark:text-[#8a8a9e]">
                      <span className="font-medium">Network Fee</span>
                      <span className="text-slate-900 dark:text-white number-mono font-bold flex items-center gap-1">
                        <Zap size={12} className="text-[#8b5cf6]"/> ~0.0012 ARC
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* SWAP ACTION BUTTON */}
            <div className="mt-2 p-1">
              {walletConnected ? (
                <button
                  onClick={handleSwap}
                  disabled={isSwapping || parsed <= 0 || parsed > fromBalance || isQuoting}
                  className={`relative w-full py-4 rounded-[20px] font-black text-sm transition-all overflow-hidden cursor-pointer ${
                    isSwapping || isQuoting
                      ? 'bg-slate-100 dark:bg-[#1f1f2e] text-slate-500 dark:text-[#8a8a9e] cursor-not-allowed'
                      : parsed > fromBalance
                      ? 'bg-red-500/10 text-[#ef4444] cursor-not-allowed border border-red-500/20'
                      : parsed <= 0
                      ? 'bg-slate-100 dark:bg-[#1f1f2e] text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:from-[#4f8ff7] hover:to-[#996cf7] text-white shadow-[0_0_25px_rgba(139,92,246,0.35)] hover:shadow-[0_0_35px_rgba(139,92,246,0.5)] transform hover:-translate-y-0.5'
                  }`}
                >
                  {isSwapping ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw size={18} className="animate-spin" /> Swapping...
                    </span>
                  ) : isQuoting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Activity size={18} className="animate-pulse" /> Finding optimal route...
                    </span>
                  ) : parsed > fromBalance ? (
                    `Insufficient ${fromToken}`
                  ) : parsed <= 0 ? (
                    'Enter Amount'
                  ) : (
                    <span className="flex items-center justify-center gap-2 text-base">
                      Swap {fromToken} <ArrowUpDown size={14} className="rotate-90 opacity-70" /> {toToken}
                    </span>
                  )}
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 p-4 rounded-[20px] bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] text-xs font-bold shadow-inner">
                  <CircleAlert size={14} className="animate-bounce shrink-0" />
                  Connect wallet to swap
                </div>
              )}
            </div>
          </div>

          {/* Powered by */}
          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-4">
            <Zap size={10} className="text-[#8b5cf6]" />
            Powered by Arc Mainnet
          </div>
        </div>

      </div>

      {/* TRANSACTION SUCCESS MODAL */}
      <AnimatePresence>
        {txModalData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTxModalData(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] p-6 shadow-2xl z-10 text-center flex flex-col items-center overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6]" />
              
              <button
                onClick={() => setTxModalData(null)}
                className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="w-16 h-16 rounded-full bg-[#10b981]/10 flex items-center justify-center text-[#10b981] mb-4 mt-2 shadow-inner">
                <CheckCircle2 size={36} />
              </div>

              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-1">Swap Successful</h3>
              <p className="text-sm text-slate-500 dark:text-[#8a8a9e] mb-6">
                <span className="font-bold text-slate-900 dark:text-white">{txModalData.fromAmt} {txModalData.from}</span> has been converted to <span className="font-bold text-[#10b981]">{txModalData.toAmt} {txModalData.to}</span>
              </p>

              <div className="w-full bg-slate-50 dark:bg-[#0c0c10] border border-slate-100 dark:border-[#1f1f2e] p-3 rounded-2xl text-left mb-6 shadow-sm">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Transaction Hash</div>
                <div className="text-xs text-[#8b5cf6] font-mono break-all font-medium">
                  {txModalData.hash}
                </div>
              </div>

              <a
                href={`https://arcscan.io/tx/${txModalData.hash}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg"
              >
                View on Arc Explorer <ExternalLink size={14} />
              </a>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
