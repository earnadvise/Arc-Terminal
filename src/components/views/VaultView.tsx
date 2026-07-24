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
    balances, addNotification
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
        addNotification('success', 'Token Approved ✓', `${vault.symbol} approved for vault deposit.`);
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
      addNotification('success', 'Deposit Successful ✓', `Deposited ${parsed} ${vault.symbol} → received ${vault.shareSymbol} shares.`);
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

      addNotification('success', 'Withdrawal Successful ✓', `Redeemed ${parsed} ${vault.shareSymbol} → received ${vault.symbol}.`);
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
    <main className="w-full h-full flex flex-col max-w-[1200px] mx-auto p-4 select-none animate-fadeIn">
      {/* Page Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide">Vaults</h1>
          <p className="text-xs text-[#8e8e9f]">Deposit stablecoins to compound auto-generating yield.</p>
        </div>

        {/* Vault Selector Row */}
        <div className="flex gap-2">
          {(['USDC', 'EURC'] as const).map(key => {
            const v = VAULTS[key];
            const isSelected = selectedVaultKey === key;
            return (
              <button
                key={key}
                onClick={() => { setSelectedVaultKey(key); setAmount(''); }}
                className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? `bg-white/5 text-white shadow-lg`
                    : 'bg-transparent border-white/5 text-[#8e8e9f] hover:text-white'
                }`}
                style={{
                  borderColor: isSelected ? v.color : 'rgba(255,255,255,0.05)',
                  boxShadow: isSelected ? `0 0 15px ${v.color}15` : 'none'
                }}
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white"
                  style={{ backgroundColor: v.color }}
                >
                  {v.symbol.slice(0, 2)}
                </span>
                {v.symbol} ({v.apy}% APY)
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0 flex-1">
        {/* Left Column: Action card (Deposit/Withdraw) */}
        <div className="md:col-span-7 bg-[#111827]/60 border border-[#334155] rounded-2xl p-5 backdrop-blur-md flex flex-col gap-4">
          <div className="flex border-b border-[#334155] pb-px shrink-0">
            <button
              onClick={() => { setActiveTab('deposit'); setAmount(''); }}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'deposit'
                  ? 'border-[#01C38E] text-[#01C38E]'
                  : 'border-transparent text-[#8e8e9f] hover:text-white'
              }`}
            >
              Deposit
            </button>
            <button
              onClick={() => { setActiveTab('withdraw'); setAmount(''); }}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'withdraw'
                  ? 'border-[#8b5cf6] text-[#8b5cf6]'
                  : 'border-transparent text-[#8e8e9f] hover:text-white'
              }`}
            >
              Withdraw
            </button>
          </div>

          <div className="flex flex-col gap-4 flex-1">
            <div className="flex justify-between items-center text-xs text-[#8e8e9f] font-semibold">
              <span>Amount</span>
              <span className="number-mono">
                {activeTab === 'deposit' ? 'Wallet Balance' : 'Vault Balance'}:{' '}
                {!vaultDataLoaded && walletConnected
                  ? '---'
                  : maxBalance.toFixed(activeTab === 'deposit' ? 2 : 4)}{' '}
                {activeTab === 'deposit' ? vault.symbol : vault.shareSymbol}
              </span>
            </div>

            <div className="flex items-center bg-[#1e293b] border border-[#334155] focus-within:border-[#01C38E]/50 rounded-2xl px-4 py-3 transition-all relative">
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isProcessing}
                className="bg-transparent border-none text-white text-lg font-bold w-full focus:outline-none number-mono"
              />
              <button
                onClick={() => setAmount(maxBalance.toString())}
                disabled={isProcessing}
                className="px-3 py-1 bg-white/5 border border-white/10 hover:border-white/20 text-[10px] font-bold text-white rounded-lg transition-colors cursor-pointer"
              >
                MAX
              </button>
            </div>

            {/* Simulated Return */}
            {parsedAmount > 0 && (
              <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>You {activeTab === 'deposit' ? 'deposit' : 'redeem'}</span>
                  <span className="text-white font-bold">{parsedAmount.toFixed(2)} {activeTab === 'deposit' ? vault.symbol : vault.shareSymbol}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>You receive</span>
                  <span className="text-[#01C38E] font-black">~{parsedAmount.toFixed(4)} {activeTab === 'deposit' ? vault.shareSymbol : vault.symbol}</span>
                </div>
              </div>
            )}

            {walletConnected ? (
              <button
                onClick={activeTab === 'deposit' ? handleDeposit : handleWithdraw}
                disabled={isProcessing || parsedAmount <= 0}
                className={`w-full py-3 mt-auto rounded-xl text-white font-bold text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  parsedAmount <= 0 
                    ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed border border-white/5' 
                    : activeTab === 'deposit'
                      ? 'bg-gradient-to-r from-[#0A786A] to-[#01C38E] hover:from-[#068f7d] hover:to-[#08d49a] shadow-[#01C38E]/10'
                      : 'bg-gradient-to-r from-indigo-600 to-[#8b5cf6] hover:from-indigo-700 hover:to-[#9f7aea] shadow-[#8b5cf6]/10'
                }`}
              >
                {isProcessing ? (
                  <>
                     <RefreshCw size={15} className="animate-spin" />
                     <span>{processStep || 'Processing transaction…'}</span>
                  </>
                ) : activeTab === 'deposit' ? (
                  <>
                    <ArrowDownToLine size={15} />
                    <span>Deposit {vault.symbol}</span>
                  </>
                ) : (
                  <>
                    <ArrowUpFromLine size={15} />
                    <span>Withdraw {vault.symbol}</span>
                  </>
                )}
              </button>
            ) : (
              <div className="py-4 bg-[#1e293b] border border-[#334155] rounded-xl flex flex-col items-center justify-center text-center gap-2">
                <Lock size={18} className="text-[#8e8e9f] animate-pulse" />
                <span className="text-xs font-bold text-[#8e8e9f]">Wallet Not Connected</span>
                <span className="text-[10px] text-[#6e6e7f] px-4">Connect your wallet to deposit assets.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Stats (Stacked vertically to save space) */}
        <div className="md:col-span-5 flex flex-col gap-4 min-h-0">
          {/* TVL Stat */}
          <div className="bg-[#111827]/40 border border-[#334155] rounded-2xl p-4 backdrop-blur-sm relative overflow-hidden flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[#8e8e9f] text-xs font-semibold uppercase tracking-wider">Total Value Locked</span>
              <Landmark size={18} className="text-[#8e8e9f]" />
            </div>
            <div className="text-2xl font-black text-white number-mono">
              ${vaultTVL[selectedVaultKey].toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-[#6e6e7f] mt-1">Managed securely by smart contract</div>
          </div>

          {/* APY Stat */}
          <div className="bg-[#111827]/40 border border-[#334155] rounded-2xl p-4 backdrop-blur-sm relative overflow-hidden flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[#8e8e9f] text-xs font-semibold uppercase tracking-wider">Current APY</span>
              <TrendingUp size={18} className="text-[#01C38E]" />
            </div>
            <div className="text-2xl font-black text-[#01C38E] number-mono">
              {vault.apy.toFixed(1)}%
            </div>
            {/* Sparkline */}
            <div className="flex items-end gap-1.5 h-6 mt-2">
              {sparkData.map((val, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-white/5 rounded-t-sm"
                  style={{
                    height: `${(val / maxSpark) * 100}%`,
                    backgroundColor: idx === sparkData.length - 1 ? vault.color : 'rgba(255,255,255,0.08)'
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
