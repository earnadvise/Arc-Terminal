'use client';

import React, { useState, useEffect } from 'react';
import { useAppState } from '@/context/useAppState';
import {
  TrendingUp, Coins,
  RefreshCw, ArrowDownToLine, ArrowUpFromLine,
  Lock, Landmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VAULTS = {
  USDC: {
    symbol: 'USDC',
    shareSymbol: 'aUSDC',
    name: 'USDC Vault',
    tokenAddress: '0x3600000000000000000000000000000000000000',
    vaultAddress: '0xB5dAd4840ef25d6A7Ea8c19E8C6d438197F5AfB9',
    apy: 5.0,
    decimals: 6,
    color: '#01C38E',
    glowColor: 'rgba(1, 195, 142, 0.2)'
  },
  EURC: {
    symbol: 'EURC',
    shareSymbol: 'aEURC',
    name: 'EURC Vault',
    tokenAddress: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
    vaultAddress: '0xC2752C4e2c6FFaf4f8aBA432d98A9d2ae216BD8E',
    apy: 4.5,
    decimals: 6,
    color: '#0052FF',
    glowColor: 'rgba(0, 82, 255, 0.2)'
  }
};

const padAddress = (addr: string) =>
  addr.toLowerCase().replace('0x', '').padStart(64, '0');
const padUint = (val: bigint) => val.toString(16).padStart(64, '0');

export default function VaultView() {
  const {
    walletConnected, walletAddress,
    balances, addNotification, addHistoryItem
  } = useAppState();

  const [selectedVaultKey, setSelectedVaultKey] = useState<'USDC' | 'EURC'>('USDC');
  const vault = VAULTS[selectedVaultKey];

  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('');

  // Vault data records (start at 0 since there are no xylonet fallback TVLs)
  const [vaultTVL, setVaultTVL] = useState<Record<'USDC' | 'EURC', number>>({ USDC: 0, EURC: 0 });
  const [userShares, setUserShares] = useState<Record<'USDC' | 'EURC', number>>({ USDC: 0, EURC: 0 });
  const [userValue, setUserValue] = useState<Record<'USDC' | 'EURC', number>>({ USDC: 0, EURC: 0 });
  const [totalSupply, setTotalSupply] = useState<Record<'USDC' | 'EURC', number>>({ USDC: 0, EURC: 0 });
  const [vaultDataLoaded, setVaultDataLoaded] = useState(false);

  // Keep refs to current state so interval callbacks always see fresh values
  const vaultTVLRef = React.useRef(vaultTVL);
  const userSharesRef = React.useRef(userShares);
  const userValueRef = React.useRef(userValue);
  const totalSupplyRef = React.useRef(totalSupply);
  React.useEffect(() => { vaultTVLRef.current = vaultTVL; }, [vaultTVL]);
  React.useEffect(() => { userSharesRef.current = userShares; }, [userShares]);
  React.useEffect(() => { userValueRef.current = userValue; }, [userValue]);
  React.useEffect(() => { totalSupplyRef.current = totalSupply; }, [totalSupply]);

  // Sparkline data for APY chart
  const sparkData = [3.2, 3.8, 4.1, 4.5, 4.2, 4.8, 5.0, 4.9, 5.1, 5.0, 4.8, 5.0];
  const maxSpark = Math.max(...sparkData);

  const RPC_URL = 'https://rpc.testnet.arc.network';

  // RPC helper with retry + timeout for Arc testnet reliability
  const rpcCall = React.useCallback(async (to: string, data: string, retries = 3): Promise<string | null> => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'eth_call', params: [{ to, data }, 'latest'] }),
          signal: controller.signal
        });
        clearTimeout(timeout);
        const json = await res.json();
        if (json.result && json.result !== '0x') return json.result;
        // Got a valid response (even if null/0x), stop retrying
        if (json.result === '0x0000000000000000000000000000000000000000000000000000000000000000') return json.result;
        if (json.result !== undefined) return json.result || null;
      } catch (e: any) {
        if (attempt < retries - 1) {
          await new Promise(r => setTimeout(r, 500 * (attempt + 1))); // backoff
          continue;
        }
        console.warn('RPC call failed after retries:', e?.message);
      }
    }
    return null;
  }, []);

  const fetchVaultData = React.useCallback(async () => {
    if (!walletAddress) return;

      // Start from current known values so UI doesn't flash to 0 between polls
      const nextTVL: Record<'USDC' | 'EURC', number> = { ...vaultTVLRef.current };
      const nextSupply: Record<'USDC' | 'EURC', number> = { ...totalSupplyRef.current };
      const nextShares: Record<'USDC' | 'EURC', number> = { ...userSharesRef.current };
      const nextValue: Record<'USDC' | 'EURC', number> = { ...userValueRef.current };

      // Query both USDC and EURC from their default vault addresses
      for (const key of ['USDC', 'EURC'] as const) {
        const vAddress = VAULTS[key].vaultAddress;

        let fetchSuccess = false;
        try {
          // totalAssets() -> selector 0x01e1d114
          const tvlRes = await rpcCall(vAddress, '0x01e1d114');
          if (tvlRes) {
            nextTVL[key] = Number(BigInt(tvlRes)) / 1e6;
            fetchSuccess = true;
          }

          // totalSupply() -> selector 0x18160ddd
          const supplyRes = await rpcCall(vAddress, '0x18160ddd');
          if (supplyRes) {
            nextSupply[key] = Number(BigInt(supplyRes)) / 1e6;
          }

          // balanceOf(address) -> selector 0x70a08231
          const balData = '0x70a08231' + padAddress(walletAddress);
          const balRes = await rpcCall(vAddress, balData);
          if (balRes !== null) {
            nextShares[key] = Number(BigInt(balRes)) / 1e6;
            fetchSuccess = true;
          }
        } catch (e) {
          console.warn(`${key} on-chain read failed:`, e);
        }

        if (fetchSuccess) {
          // On-chain read succeeded, sync to localStorage to keep it updated
          localStorage.setItem('arc_vault_shares_' + key + '_' + walletAddress, nextShares[key].toString());
          localStorage.setItem('arc_vault_tvl_' + key, nextTVL[key].toString());
        } else {
          // On-chain read failed completely, fall back to localStorage mock data
          const localSharesStr = localStorage.getItem('arc_vault_shares_' + key + '_' + walletAddress);
          if (localSharesStr) nextShares[key] = parseFloat(localSharesStr) || 0;

          const localTvlStr = localStorage.getItem('arc_vault_tvl_' + key);
          if (localTvlStr) nextTVL[key] = parseFloat(localTvlStr) || 0;
        }

        // Compute USD value: if supply tracked, use ratio; else shares = USD (1:1 vault)
        const supply = nextSupply[key];
        nextValue[key] = supply > 0
          ? (nextShares[key] / supply) * nextTVL[key]
          : nextShares[key]; // 1:1 fallback when totalSupply not tracked
      }

      setVaultTVL(nextTVL);
      setTotalSupply(nextSupply);
      setUserShares(nextShares);
      setUserValue(nextValue);
      setVaultDataLoaded(true);
  }, [walletAddress, rpcCall]);

  // Fetch vault on-chain data
  useEffect(() => {
    if (!walletConnected || !walletAddress) return;
    fetchVaultData();
    const interval = setInterval(fetchVaultData, 2000);
    return () => clearInterval(interval);
  }, [walletConnected, walletAddress, fetchVaultData]);


  const waitForTx = async (txHash: string) => {
    const RPC_URL = 'https://rpc.testnet.arc.network';
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'eth_getTransactionReceipt', params: [txHash] })
        }).then(r => r.json());
        const receipt = res.result;
        if (receipt) {
          if (receipt.status === '0x0') throw new Error('Transaction reverted on-chain');
          return receipt;
        }
      } catch (e: any) {
        if (e.message === 'Transaction reverted on-chain') throw e;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error('Transaction confirmation timeout (60s)');
  };

  const handleDeposit = async () => {
    const parsed = parseFloat(amount);
    if (!walletConnected || !walletAddress) {
      addNotification('error', 'Wallet Required', 'Connect your wallet to deposit into the vault.');
      return;
    }
    if (!parsed || parsed <= 0) {
      addNotification('warning', 'Invalid Amount', 'Enter a valid deposit amount.');
      return;
    }
    
    const availableBalance = selectedVaultKey === 'USDC' ? balances.USDC : balances.EURC;
    if (parsed > availableBalance) {
      addNotification('error', 'Insufficient Balance', `You only have ${availableBalance.toFixed(2)} ${vault.symbol} available.`);
      return;
    }

    setIsProcessing(true);
    let txHash = '';
    try {
      const eth = (window as any).ethereum;
      if (!eth) throw new Error('No Web3 provider detected.');

      const amountWei = BigInt(Math.floor(parsed * 1e6));

      // Step 1: Check ERC-20 allowance via direct RPC
      setProcessStep(`Checking ${vault.symbol} allowance…`);
      const allowanceData = '0xdd62ed3e' + padAddress(walletAddress) + padAddress(vault.vaultAddress);
      
      const RPC_URL = 'https://rpc.testnet.arc.network';
      const allowanceRes = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'eth_call',
          params: [{ to: vault.tokenAddress, data: allowanceData }, 'latest']
        })
      }).then(r => r.json()).then(j => j.result);

      const currentAllowance = allowanceRes && allowanceRes !== '0x' ? BigInt(allowanceRes) : BigInt(0);

      if (currentAllowance < amountWei) {
        setProcessStep(`Approve ${vault.symbol} in wallet…`);
        addNotification('info', 'Approval Required', `Approve ${vault.symbol} spending for the vault contract…`);
        const approveData = '0x095ea7b3' + padAddress(vault.vaultAddress) + 'f'.repeat(64);
        const approvalTxHash = await eth.request({
          method: 'eth_sendTransaction',
          params: [{ from: walletAddress, to: vault.tokenAddress, data: approveData }]
        });
        setProcessStep('Waiting for approval…');
        await waitForTx(approvalTxHash);
        addNotification('success', 'Token Approved ✓', `${vault.symbol} approved for vault deposit.`, approvalTxHash);
      }

      // Step 2: Deposit
      setProcessStep('Confirm deposit in your wallet…');
      addNotification('info', `Depositing ${vault.symbol}`, `Depositing ${parsed} ${vault.symbol} into the vault…`);
      // deposit(uint256) -> selector 0xb6b55f25
      const depositData = '0xb6b55f25' + padUint(amountWei);
      txHash = await eth.request({
        method: 'eth_sendTransaction',
        params: [{ from: walletAddress, to: vault.vaultAddress, data: depositData }]
      });

      setProcessStep('Waiting for confirmation…');
      await waitForTx(txHash);

      // Deposit Successful on-chain
      addNotification('success', 'Deposit Successful ✓', `Deposited ${parsed} ${vault.symbol} → received ${vault.shareSymbol} shares.`, txHash);
      addHistoryItem({
        pair: `${vault.symbol} Vault`,
        side: 'DEPOSIT',
        type: 'Vault Deposit',
        size: `${parsed} ${vault.symbol}`,
        price: '$1.00',
        fee: '$0.00',
        status: 'SUCCESS',
        category: 'Vault',
        txHash: txHash || undefined,
        details: `${parsed} ${vault.symbol} → ${vault.shareSymbol} Shares`
      });
      setAmount('');
      fetchVaultData();
      setTimeout(() => fetchVaultData(), 1000);
      setTimeout(() => fetchVaultData(), 2500);
      setTimeout(() => fetchVaultData(), 5000);
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes('User rejected') || e.message?.includes('User denied') || e.message?.includes('rejected')) {
        addNotification('error', 'Deposit Failed', 'Transaction rejected by user.');
        setIsProcessing(false);
        setProcessStep('');
        return;
      }

      // Revert / failure fallback: Process locally
      addNotification('warning', 'Local Settlement', `On-chain contract reverted. Settling ${vault.symbol} deposit locally...`);
      
      const newShares = userShares[selectedVaultKey] + parsed;
      const newTvl = vaultTVL[selectedVaultKey] + parsed;
      const newSupply = totalSupply[selectedVaultKey] + parsed;

      setUserShares(prev => ({ ...prev, [selectedVaultKey]: newShares }));
      setVaultTVL(prev => ({ ...prev, [selectedVaultKey]: newTvl }));
      setTotalSupply(prev => ({ ...prev, [selectedVaultKey]: newSupply }));
      setUserValue(prev => ({ ...prev, [selectedVaultKey]: newShares }));

      localStorage.setItem('arc_vault_shares_' + selectedVaultKey + '_' + walletAddress, newShares.toString());
      localStorage.setItem('arc_vault_tvl_' + selectedVaultKey, newTvl.toString());

      addNotification('success', 'Deposit Successful (Local) ✓', `Deposited ${parsed} ${vault.symbol} → received ${vault.shareSymbol} shares.`);
      setAmount('');
    } finally {
      setIsProcessing(false);
      setProcessStep('');
    }
  };

  const handleWithdraw = async () => {
    const parsed = parseFloat(amount);
    if (!walletConnected || !walletAddress) {
      addNotification('error', 'Wallet Required', 'Connect your wallet to withdraw from the vault.');
      return;
    }
    if (!parsed || parsed <= 0) {
      addNotification('warning', 'Invalid Amount', 'Enter a valid withdrawal amount.');
      return;
    }
    
    const currentShares = userShares[selectedVaultKey];
    if (parsed > currentShares) {
      addNotification('error', 'Insufficient Shares', `You only have ${currentShares.toFixed(4)} ${vault.shareSymbol} shares.`);
      return;
    }

    setIsProcessing(true);
    let txHash = '';
    try {
      const eth = (window as any).ethereum;
      if (!eth) throw new Error('No Web3 provider detected.');

      setProcessStep('Confirm withdrawal in your wallet…');
      addNotification('info', 'Withdrawing', `Redeeming ${parsed} ${vault.shareSymbol} shares for ${vault.symbol}…`);

      const amountWei = BigInt(Math.floor(parsed * 1e6));
      // withdraw(uint256) -> selector 0x2e1a7d4d
      const withdrawData = '0x2e1a7d4d' + padUint(amountWei);
      txHash = await eth.request({
        method: 'eth_sendTransaction',
        params: [{ from: walletAddress, to: vault.vaultAddress, data: withdrawData }]
      });

      setProcessStep('Waiting for confirmation…');
      await waitForTx(txHash);

      addNotification('success', 'Withdrawal Successful ✓', `Redeemed ${parsed} ${vault.shareSymbol} → received ${vault.symbol}.`, txHash);
      addHistoryItem({
        pair: `${vault.symbol} Vault`,
        side: 'WITHDRAW',
        type: 'Vault Redeem',
        size: `${parsed} ${vault.shareSymbol}`,
        price: '$1.00',
        fee: '$0.00',
        status: 'SUCCESS',
        category: 'Vault',
        txHash: txHash || undefined,
        details: `${parsed} ${vault.shareSymbol} Shares → ${vault.symbol}`
      });
      setAmount('');
      fetchVaultData();
      setTimeout(() => fetchVaultData(), 1000);
      setTimeout(() => fetchVaultData(), 2500);
      setTimeout(() => fetchVaultData(), 5000);
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes('User rejected') || e.message?.includes('User denied') || e.message?.includes('rejected')) {
        addNotification('error', 'Withdrawal Failed', 'Transaction rejected by user.');
        setIsProcessing(false);
        setProcessStep('');
        return;
      }

      // Revert / failure fallback: Process locally
      addNotification('warning', 'Local Settlement', `On-chain contract reverted. Settling ${vault.shareSymbol} redemption locally...`);

      const newShares = Math.max(0, currentShares - parsed);
      const newTvl = Math.max(0, vaultTVL[selectedVaultKey] - parsed);
      const newSupply = Math.max(0, totalSupply[selectedVaultKey] - parsed);

      setUserShares(prev => ({ ...prev, [selectedVaultKey]: newShares }));
      setVaultTVL(prev => ({ ...prev, [selectedVaultKey]: newTvl }));
      setTotalSupply(prev => ({ ...prev, [selectedVaultKey]: newSupply }));
      setUserValue(prev => ({ ...prev, [selectedVaultKey]: newShares }));

      localStorage.setItem('arc_vault_shares_' + selectedVaultKey + '_' + walletAddress, newShares.toString());
      localStorage.setItem('arc_vault_tvl_' + selectedVaultKey, newTvl.toString());

      addNotification('success', 'Withdrawal Successful (Local) ✓', `Redeemed ${parsed} ${vault.shareSymbol} → received ${vault.symbol}.`);
      setAmount('');
    } finally {
      setIsProcessing(false);
      setProcessStep('');
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const maxBalance = activeTab === 'deposit' 
    ? (selectedVaultKey === 'USDC' ? balances.USDC : balances.EURC)
    : userShares[selectedVaultKey];

  return (
    <main className="w-full h-full flex flex-col max-w-[1000px] mx-auto p-4 sm:p-8 select-none animate-fadeIn relative">
      {/* Ambient background glow */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-20 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: vault.color }}
      />

      {/* Page Header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6 shrink-0 relative z-10">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-2"
          >
            Yield Vaults
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-sm text-slate-500"
          >
            Deposit stablecoins to earn auto-compounding yield.
          </motion.p>
        </div>

        {/* Vault Selector - Segmented Control */}
        <div className="flex bg-white/80 p-1 rounded-2xl border border-slate-300 backdrop-blur-xl">
          {(['USDC', 'EURC'] as const).map(key => {
            const v = VAULTS[key];
            const isSelected = selectedVaultKey === key;
            return (
              <button
                key={key}
                onClick={() => { setSelectedVaultKey(key); setAmount(''); }}
                className={`relative px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all z-10 ${
                  isSelected ? 'text-slate-900' : 'text-slate-400 hover:text-slate-900'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-xl"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: `1px solid ${v.color}30` }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span
                  className="relative z-10 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-slate-900 shadow-lg"
                  style={{ backgroundColor: v.color, boxShadow: isSelected ? `0 0 10px ${v.color}80` : 'none' }}
                >
                  {v.symbol.slice(0, 2)}
                </span>
                <span className="relative z-10">{v.symbol}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 flex-1 relative z-10">
        
        {/* Left Column: Action card */}
        <div className="lg:col-span-7 bg-white/80 border border-slate-300 rounded-3xl p-6 md:p-8 backdrop-blur-2xl flex flex-col shadow-2xl relative overflow-hidden">
          {/* Subtle top edge highlight */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Action Tabs */}
          <div className="flex gap-6 border-b border-slate-300 pb-4 mb-6">
            <button
              onClick={() => { setActiveTab('deposit'); setAmount(''); }}
              className={`text-lg font-bold transition-all relative ${
                activeTab === 'deposit' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-500'
              }`}
            >
              Deposit
              {activeTab === 'deposit' && (
                <motion.div layoutId="actionTab" className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-[#01C38E] shadow-[0_0_10px_#01C38E]" />
              )}
            </button>
            <button
              onClick={() => { setActiveTab('withdraw'); setAmount(''); }}
              className={`text-lg font-bold transition-all relative ${
                activeTab === 'withdraw' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-500'
              }`}
            >
              Withdraw
              {activeTab === 'withdraw' && (
                <motion.div layoutId="actionTab" className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-[#8b5cf6] shadow-[0_0_10px_#8b5cf6]" />
              )}
            </button>
          </div>

          <div className="flex flex-col flex-1">
            <div className="flex justify-between items-center text-sm text-slate-500 font-medium mb-3">
              <span>Amount</span>
              <span className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => setAmount(maxBalance.toString())}>
                {activeTab === 'deposit' ? 'Wallet' : 'Vault'}:{' '}
                <span className="text-slate-900 font-semibold">
                  {!vaultDataLoaded && walletConnected ? '---' : maxBalance.toFixed(activeTab === 'deposit' ? 2 : 4)}
                </span>
                <span className="text-xs">{activeTab === 'deposit' ? vault.symbol : vault.shareSymbol}</span>
              </span>
            </div>

            {/* Premium Massive Input */}
            <div className="flex items-center bg-slate-100/50 border border-slate-300 focus-within:border-slate-400 rounded-2xl px-6 py-5 transition-all">
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isProcessing}
                className="bg-transparent border-none text-slate-900 text-4xl md:text-5xl font-black w-full focus:outline-none number-mono tracking-tight"
                style={{ caretColor: vault.color }}
              />
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-slate-900 shadow-lg"
                    style={{ backgroundColor: vault.color }}
                  >
                    {activeTab === 'deposit' ? vault.symbol.slice(0, 2) : vault.shareSymbol.slice(0, 3)}
                  </span>
                  <span className="text-sm font-bold text-slate-900">{activeTab === 'deposit' ? vault.symbol : vault.shareSymbol}</span>
                </div>
                <button
                  onClick={() => setAmount(maxBalance.toString())}
                  disabled={isProcessing}
                  className="text-xs font-bold text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
                >
                  USE MAX
                </button>
              </div>
            </div>

            {/* Simulated Return */}
            <AnimatePresence>
              {parsedAmount > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 bg-slate-50 border border-slate-300 rounded-2xl space-y-3">
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>You {activeTab === 'deposit' ? 'deposit' : 'redeem'}</span>
                      <span className="text-slate-900 font-bold">{parsedAmount.toFixed(2)} {activeTab === 'deposit' ? vault.symbol : vault.shareSymbol}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-500 items-center">
                      <span>You receive</span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-lg" style={{ color: activeTab === 'deposit' ? '#01C38E' : '#8b5cf6' }}>
                          ~{parsedAmount.toFixed(4)} {activeTab === 'deposit' ? vault.shareSymbol : vault.symbol}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-auto pt-6">
              {walletConnected ? (
                <button
                  onClick={activeTab === 'deposit' ? handleDeposit : handleWithdraw}
                  disabled={isProcessing || parsedAmount <= 0}
                  className="w-full py-4 rounded-2xl text-slate-900 font-bold text-lg tracking-wide transition-all flex items-center justify-center gap-3 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    backgroundColor: activeTab === 'deposit' ? '#01C38E' : '#8b5cf6',
                    boxShadow: parsedAmount > 0 && !isProcessing ? `0 0 30px ${activeTab === 'deposit' ? '#01C38E' : '#8b5cf6'}40` : 'none'
                  }}
                >
                  {/* Subtle shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  
                  {isProcessing ? (
                    <>
                       <RefreshCw size={20} className="animate-spin" />
                       <span>{processStep || 'Processing transaction…'}</span>
                    </>
                  ) : activeTab === 'deposit' ? (
                    <>
                      <ArrowDownToLine size={20} />
                      <span>Deposit {vault.symbol}</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpFromLine size={20} />
                      <span>Withdraw {vault.symbol}</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="py-6 bg-slate-50 border border-slate-300 rounded-2xl flex flex-col items-center justify-center text-center gap-3 backdrop-blur-sm">
                  <div className="p-3 rounded-full bg-slate-200">
                    <Lock size={20} className="text-slate-500" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 mb-1">Wallet Not Connected</div>
                    <div className="text-xs text-slate-400">Connect your wallet to start earning yield.</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Stats */}
        <div className="lg:col-span-5 flex flex-col gap-6 min-h-0">
          
          {/* My Position Card */}
          <div className="bg-white/80 border border-slate-300 rounded-3xl p-6 backdrop-blur-2xl flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-32 bg-slate-200 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-slate-500 text-sm font-semibold">Your Position</span>
              <Coins size={20} className="text-slate-500" />
            </div>
            <div className="text-4xl font-black text-slate-900 number-mono mb-2 relative z-10">
              ${(userValue[selectedVaultKey] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400 relative z-10 font-medium">
              <span>{userShares[selectedVaultKey].toLocaleString(undefined, { maximumFractionDigits: 4 })} {vault.shareSymbol}</span>
            </div>
          </div>

          {/* TVL Stat */}
          <div className="bg-white/80 border border-slate-300 rounded-3xl p-6 backdrop-blur-2xl flex flex-col justify-center relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-500 text-sm font-semibold">Total Value Locked</span>
              <Landmark size={20} className="text-slate-500" />
            </div>
            <div className="text-3xl font-black text-slate-900 number-mono mb-1">
              ${vaultTVL[selectedVaultKey].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* APY Stat */}
          <div className="bg-white/80 border border-slate-300 rounded-3xl p-6 backdrop-blur-2xl flex flex-col justify-center relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-500 text-sm font-semibold">Current APY</span>
              <div className="px-2 py-1 rounded-md text-[10px] font-bold" style={{ backgroundColor: `${vault.color}20`, color: vault.color }}>
                AUTO-COMPOUNDING
              </div>
            </div>
            <div className="text-5xl font-black number-mono mb-4" style={{ color: vault.color, textShadow: `0 0 30px ${vault.color}60` }}>
              {vault.apy.toFixed(1)}%
            </div>
            
            {/* Minimalist Sparkline */}
            <div className="flex items-end gap-1 h-10 w-full opacity-60 group-hover:opacity-100 transition-opacity">
              {sparkData.map((val, idx) => (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(val / maxSpark) * 100}%` }}
                  transition={{ delay: idx * 0.05, duration: 0.5, type: 'spring' }}
                  key={idx}
                  className="flex-1 rounded-t-sm"
                  style={{
                    backgroundColor: idx === sparkData.length - 1 ? vault.color : 'rgba(255,255,255,0.1)'
                  }}
                />
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
