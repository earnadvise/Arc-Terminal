'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppState } from '@/context/useAppState';
import { useUnifiedBalance } from '@/lib/circle-unified-balance-kit';
import { Layers, Activity, TrendingUp, Search, RefreshCw, CheckCircle2, ArrowDownCircle, ArrowUpCircle, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';

export default function EarnView() {
  const { walletConnected, walletAddress, addNotification, balances } = useAppState();
  const { spend, balances: unifiedBalances } = useUnifiedBalance();

  const [vaults, setVaults] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [activeTab, setActiveTab] = useState<'Discover' | 'Portfolio'>('Discover');
  
  // Deposit/Withdraw Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'Deposit' | 'Withdraw'>('Deposit');
  const [selectedVault, setSelectedVault] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Quote State
  const [quote, setQuote] = useState<any>(null);

  const fetchVaults = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError('');
      const { AppKit } = await import('@circle-fin/app-kit');
      const kit = new AppKit();
      const { vaults: fetchedVaults } = await kit.earn.exploreVaults({
        chain: "Arc",
        sortBy: "apy"
      });
      setVaults(fetchedVaults || []);
      
      // If wallet is connected, fetch positions for all active vaults
      if (walletConnected && typeof window !== 'undefined' && (window as any).ethereum) {
        const { createEthersAdapterFromProvider } = await import('@circle-fin/adapter-ethers-v6');
        const adapter = await createEthersAdapterFromProvider({ provider: (window as any).ethereum });
        
        const posPromises = (fetchedVaults || []).map((v: any) => 
          kit.earn.getPosition({
            from: { adapter, chain: "Arc" },
            vaultAddress: v.vaultAddress
          }).catch(() => null)
        );
        
        const results = await Promise.all(posPromises);
        setPositions(results.filter(r => r !== null && Number(r.currentBalance) > 0));
      }
    } catch (e: any) {
      console.error("Failed to fetch Earn data", e);
      try {
        const { isKitError, getErrorMessage } = await import('@circle-fin/app-kit');
        if (isKitError(e)) {
          setFetchError(getErrorMessage(e));
        } else {
          setFetchError(e?.message || 'Unknown error');
        }
      } catch (err) {
        setFetchError(e?.message || 'Unknown error');
      }
    } finally {
      setLoading(false);
    }
  }, [walletConnected]);

  useEffect(() => {
    fetchVaults();
  }, [fetchVaults]);

  // Handle Quote Fetching when amount changes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const fetchQuote = async () => {
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0 || !selectedVault || !walletConnected) {
        setQuote(null);
        return;
      }
      
      try {
        const { AppKit } = await import('@circle-fin/app-kit');
        const { createEthersAdapterFromProvider } = await import('@circle-fin/adapter-ethers-v6');
        const kit = new AppKit();
        const adapter = await createEthersAdapterFromProvider({ provider: (window as any).ethereum });
        
        // Format to strict decimal string (e.g. "10.00")
        const formattedAmount = Number(amount).toFixed(2);
        
        if (modalType === 'Deposit') {
          const q = await kit.earn.getDepositQuote({
            from: { adapter, chain: "Arc" },
            vaultAddress: selectedVault.vaultAddress,
            amount: formattedAmount
          });
          setQuote(q);
        } else {
          const q = await kit.earn.getWithdrawalQuote({
            from: { adapter, chain: "Arc" },
            vaultAddress: selectedVault.vaultAddress,
            amount: formattedAmount
          });
          setQuote(q);
        }
      } catch (e: any) {
        console.error("Quote error:", e);
        setQuote(null);
      }
    };

    if (modalOpen) {
      timeoutId = setTimeout(fetchQuote, 500); // Debounce
    }
    
    return () => clearTimeout(timeoutId);
  }, [amount, selectedVault, modalOpen, modalType, walletConnected]);

  const handleAction = async () => {
    if (!walletConnected) {
      addNotification('Wallet Not Connected', 'Please connect your wallet first.', 'warning');
      return;
    }
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      addNotification('Invalid Amount', 'Please enter a valid amount greater than zero.', 'warning');
      return;
    }

    try {
      setProcessing(true);
      const { AppKit, isKitError, getErrorMessage } = await import('@circle-fin/app-kit');
      const { createEthersAdapterFromProvider } = await import('@circle-fin/adapter-ethers-v6');
      const kit = new AppKit();
      const adapter = await createEthersAdapterFromProvider({ provider: (window as any).ethereum });
      const formattedAmount = Number(amount).toFixed(2);
      
      let result;
      if (modalType === 'Deposit') {
        const numAmount = Number(formattedAmount);
        const tokenName = selectedVault.asset || 'USDC';
        
        // Unified Balance Logic: Bridge if short on native Arc USDC
        if (tokenName === 'USDC' && balances.USDC < numAmount) {
          if (unifiedBalances?.USDC >= numAmount) {
            addNotification('info', 'Unified Balance', 'Bridging cross-chain USDC to Arc Mainnet...');
            try {
              await spend({ amount: numAmount, to: walletAddress, chain: "Arc" });
              addNotification('success', 'Bridge Complete', 'Cross-chain USDC bridged! Proceeding to deposit...');
            } catch (err: any) {
              addNotification('error', 'Bridge Failed', err.message || 'Failed to bridge cross-chain USDC.');
              setProcessing(false);
              return;
            }
          } else {
            addNotification('warning', 'Insufficient Balance', 'Not enough USDC across any network.');
            setProcessing(false);
            return;
          }
        }

        result = await kit.earn.deposit({
          from: { adapter, chain: "Arc" },
          vaultAddress: selectedVault.vaultAddress,
          amount: formattedAmount
        });
        addNotification('Deposit Successful', `Successfully deposited ${formattedAmount} into ${selectedVault.name}`, 'success', result.txHash);
      } else {
        result = await kit.earn.withdraw({
          from: { adapter, chain: "Arc" },
          vaultAddress: selectedVault.vaultAddress,
          amount: formattedAmount
        });
        addNotification('Withdrawal Successful', `Successfully withdrew ${formattedAmount} from ${selectedVault.name}`, 'success', result.txHash);
      }
      
      // Reset & Refresh
      setModalOpen(false);
      setAmount('');
      fetchVaults();
      
    } catch (error: any) {
      console.error("Action error:", error);
      try {
        const { isKitError, getErrorMessage } = await import('@circle-fin/app-kit');
        if (isKitError(error)) {
          addNotification('Earn Error', getErrorMessage(error), 'error');
        } else {
          addNotification('Error', error?.message || 'An unknown error occurred.', 'error');
        }
      } catch(e) {
        addNotification('Error', error?.message || 'An unknown error occurred.', 'error');
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="w-full flex-1 max-w-[1200px] mx-auto p-4 lg:p-6 space-y-6 select-none animate-fadeIn">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Layers className="text-[#8b5cf6]" size={24} />
            Arc Earn
          </h1>
          <p className="text-sm text-slate-500 dark:text-[#8a8a9e]">
            Access curated, embedded lending opportunities across top DeFi protocols like Morpho.
          </p>
        </div>
        <button 
          onClick={fetchVaults}
          disabled={loading}
          className="p-2 rounded-lg bg-white dark:bg-[#13131a] border border-slate-200 dark:border-[#1f1f2e] text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* TABS */}
      <div className="flex p-1 bg-slate-100 dark:bg-[#13131a] rounded-xl border border-slate-200 dark:border-[#1f1f2e] w-fit">
        <button 
          onClick={() => setActiveTab('Discover')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'Discover' 
              ? 'bg-white dark:bg-[#1f1f2e] text-slate-900 dark:text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:text-[#8a8a9e] dark:hover:text-slate-300'
          }`}
        >
          Discover Vaults
        </button>
        <button 
          onClick={() => setActiveTab('Portfolio')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'Portfolio' 
              ? 'bg-white dark:bg-[#1f1f2e] text-slate-900 dark:text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:text-[#8a8a9e] dark:hover:text-slate-300'
          }`}
        >
          My Positions
        </button>
      </div>

      {/* CONTENT */}
      {loading && vaults.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="animate-spin" size={24} />
          <span className="text-sm font-medium">Fetching Arc Mainnet Vaults...</span>
        </div>
      ) : fetchError ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-red-500">
          <AlertTriangle size={32} />
          <span className="text-sm font-bold">Failed to load vaults</span>
          <span className="text-xs text-red-400">{fetchError}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {activeTab === 'Discover' && vaults.length === 0 && (
             <div className="col-span-full py-20 flex flex-col items-center justify-center gap-3 text-slate-400 border border-dashed rounded-2xl border-slate-300 dark:border-[#2a2a3b]">
               <Activity size={32} className="opacity-50" />
               <span className="text-sm font-medium text-slate-500">No vaults currently found on Arc Mainnet.</span>
             </div>
          )}

          {activeTab === 'Discover' && vaults.map((v, i) => (
            <div key={i} className="bg-white dark:bg-[#13131a] rounded-2xl border border-slate-200 dark:border-[#1f1f2e] p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#3b82f6] flex items-center justify-center text-white font-bold text-xs">
                      {v.asset?.substring(0, 1)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">{v.name || 'Unnamed Vault'}</h3>
                      <p className="text-xs text-slate-500 dark:text-[#8a8a9e]">Protocol: {v.protocol}</p>
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-[#10b981]/10 text-[#10b981] rounded text-[10px] font-bold uppercase">
                    {v.status}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-[#8a8a9e] mb-1">Current APY</p>
                    <p className="text-lg font-black text-[#10b981]">{(v.currentApy * 100).toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-[#8a8a9e] mb-1">Asset</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white">{v.asset}</p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setSelectedVault(v);
                  setModalType('Deposit');
                  setModalOpen(true);
                  setAmount('');
                  setQuote(null);
                }}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <ArrowDownCircle size={16} />
                Deposit
              </button>
            </div>
          ))}

          {activeTab === 'Portfolio' && (
            positions.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center gap-3 text-slate-400 border border-dashed rounded-2xl border-slate-300 dark:border-[#2a2a3b]">
                <Activity size={32} className="opacity-50" />
                <span className="text-sm font-medium text-slate-500">No active positions found in Earn.</span>
              </div>
            ) : (
              positions.map((p, i) => {
                const vaultRef = vaults.find(v => v.vaultAddress === p.vaultAddress);
                return (
                  <div key={i} className="bg-gradient-to-br from-white to-slate-50 dark:from-[#13131a] dark:to-[#1a1a24] rounded-2xl border border-slate-200 dark:border-[#2a2a3b] p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#10b981] to-[#3b82f6] flex items-center justify-center text-white font-bold text-xs">
                          {p.asset?.substring(0, 1)}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm">{p.vaultName || 'Unknown Vault'}</h3>
                          <p className="text-xs text-slate-500 dark:text-[#8a8a9e] number-mono">{p.asset} • APY: {(p.currentApy * 100).toFixed(2)}%</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-6 bg-white dark:bg-[#0c0e13] p-3 rounded-xl border border-slate-100 dark:border-[#1f1f2e]">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Current Balance</span>
                        <span className="font-black text-slate-900 dark:text-white number-mono text-lg">{p.currentBalance} {p.asset}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Principal</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 number-mono text-sm">{p.pnl?.principalDeposited || '0.00'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#10b981] font-bold">Total Yield Earned</span>
                        <span className="font-black text-[#10b981] number-mono text-sm">+{p.pnl?.totalYieldEarned || '0.00'}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedVault(vaultRef || { vaultAddress: p.vaultAddress, name: p.vaultName, asset: p.asset });
                          setModalType('Deposit');
                          setModalOpen(true);
                          setAmount('');
                          setQuote(null);
                        }}
                        className="flex-1 py-2 bg-slate-100 dark:bg-[#1f1f2e] hover:bg-slate-200 dark:hover:bg-[#2a2a3b] text-slate-900 dark:text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ArrowDownCircle size={14} /> Deposit
                      </button>
                      <button
                        onClick={() => {
                          setSelectedVault(vaultRef || { vaultAddress: p.vaultAddress, name: p.vaultName, asset: p.asset });
                          setModalType('Withdraw');
                          setModalOpen(true);
                          setAmount('');
                          setQuote(null);
                        }}
                        className="flex-1 py-2 bg-slate-100 dark:bg-[#1f1f2e] hover:bg-slate-200 dark:hover:bg-[#2a2a3b] text-slate-900 dark:text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ArrowUpCircle size={14} /> Withdraw
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      )}

      {/* MODAL OVERLAY */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#13131a] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-[#1f1f2e] overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-[#1f1f2e] flex justify-between items-center bg-slate-50 dark:bg-[#0c0e13]">
              <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
                {modalType === 'Deposit' ? <ArrowDownCircle className="text-[#10b981]" size={20}/> : <ArrowUpCircle className="text-[#8b5cf6]" size={20}/>}
                {modalType} {selectedVault?.asset}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-[#8a8a9e] mb-1.5 uppercase tracking-wider">
                  Vault
                </label>
                <div className="px-3 py-2.5 bg-slate-100 dark:bg-[#1f1f2e] rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300">
                  {selectedVault?.name || selectedVault?.vaultAddress}
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-[#8a8a9e] uppercase tracking-wider">
                    Amount
                  </label>
                  <button 
                    onClick={() => {
                      if (modalType === 'Deposit') {
                        if (selectedVault?.asset === 'USDC') {
                          const total = (balances?.USDC || 0) + (unifiedBalances?.USDC || 0);
                          setAmount(total.toString());
                        }
                        else if (selectedVault?.asset === 'EURC') setAmount(balances?.EURC?.toString() || '0');
                        else setAmount('0');
                      } else {
                        const pos = positions.find(p => p.vaultAddress === selectedVault?.vaultAddress);
                        setAmount(pos?.currentBalance || '0');
                      }
                    }}
                    className="text-[10px] font-bold text-[#8b5cf6] bg-[#8b5cf6]/10 px-2 py-0.5 rounded hover:bg-[#8b5cf6]/20 transition-colors"
                  >
                    MAX
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white dark:bg-[#0c0e13] border border-slate-200 dark:border-[#2a2a3b] rounded-xl px-4 py-3 text-xl font-black text-slate-900 dark:text-white outline-none focus:border-[#8b5cf6] transition-colors number-mono"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    {selectedVault?.asset}
                  </div>
                </div>
                {modalType === 'Deposit' && selectedVault?.asset === 'USDC' && (
                  <div className="text-[11px] font-medium text-slate-500 text-right mt-1.5 flex items-center justify-end gap-1">
                    Available: {((balances?.USDC || 0) + (unifiedBalances?.USDC || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                    {unifiedBalances?.USDC > 0 && <span className="text-[#f59e0b] ml-1">(Cross-Chain Enabled)</span>}
                  </div>
                )}
              </div>
              
              {/* QUOTE PREVIEW */}
              {amount && Number(amount) > 0 && (
                <div className="bg-sky-50 dark:bg-[#1f1f2e]/50 border border-sky-100 dark:border-[#2a2a3b] rounded-xl p-4 space-y-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Quote Preview</div>
                  
                  {!quote ? (
                     <div className="flex items-center gap-2 text-xs text-slate-500">
                       <Loader2 className="animate-spin" size={14} /> Fetching quote...
                     </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Share Price</span>
                        <span className="font-medium text-slate-900 dark:text-white number-mono">{quote.sharePrice}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Expected Shares</span>
                        <span className="font-medium text-slate-900 dark:text-white number-mono">
                          {modalType === 'Deposit' ? quote.expectedShares?.amount : quote.sharesToRedeem?.amount}
                        </span>
                      </div>
                      {quote.fees?.length > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Fees</span>
                          <span className="font-medium text-amber-500 number-mono">
                            {quote.fees.map((f: any) => `${f.amount} ${f.symbol}`).join(', ')}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <button
                onClick={handleAction}
                disabled={processing || !amount || Number(amount) <= 0}
                className="w-full py-3.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-xl font-black text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <><Loader2 className="animate-spin" size={18} /> Processing...</>
                ) : (
                  <>Confirm {modalType}</>
                )}
              </button>
              
              <div className="text-center">
                <p className="text-[10px] text-slate-400 dark:text-[#6e6e7f]">
                  Note: Some wallets (like Rabby) may show a "Simulation Failed" warning when signing. As long as the quote succeeded, this is normal and the transaction will go through.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
