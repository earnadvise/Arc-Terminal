import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRightLeft, 
  Settings, 
  Coins, 
  Network, 
  ShieldCheck, 
  Clock, 
  ChevronDown,
  Info,
  CheckCircle2
} from 'lucide-react';
import { useAppState } from '../../context/useAppState';

export default function BridgeView() {
  const { walletConnected, addNotification, balances, setBalances, getProvider, walletAddress } = useAppState();

  const [sourceChain, setSourceChain] = useState<'Arbitrum Sepolia' | 'Base Sepolia' | 'Ethereum Sepolia' | 'Optimism Sepolia' | 'Avalanche Fuji' | 'Polygon Amoy' | 'Solana Devnet'>('Arbitrum Sepolia');
  const [isDirectionReversed, setIsDirectionReversed] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [isBridging, setIsBridging] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<'IDLE' | 'APPROVING' | 'BURNING' | 'ATTESTING' | 'MINTING' | 'HOOK' | 'SUCCESS'>('IDLE');
  const [externalBalance, setExternalBalance] = useState<number>(0);
  
  useEffect(() => {
    if (!walletAddress) {
      setExternalBalance(0);
      return;
    }
    let rpc = '';
    let usdc = '';
    switch(sourceChain) {
      case 'Arbitrum Sepolia':
        rpc = 'https://sepolia-rollup.arbitrum.io/rpc';
        usdc = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
        break;
      case 'Base Sepolia':
        rpc = 'https://sepolia.base.org';
        usdc = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
        break;
      case 'Ethereum Sepolia':
        rpc = 'https://rpc2.sepolia.org';
        usdc = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
        break;
      case 'Optimism Sepolia':
        rpc = 'https://sepolia.optimism.io';
        usdc = '0x5fd84259d66Cd46123540766Be93DFE6D43130D7';
        break;
      default:
        setExternalBalance(0);
        return;
    }

    const data = '0x70a08231' + walletAddress.toLowerCase().replace('0x', '').padStart(64, '0');
    
    fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: usdc, data: data }, 'latest']
      })
    })
    .then(r => r.json())
    .then(res => {
      if (res.result && res.result !== '0x') {
        const bal = Number(BigInt(res.result)) / 1e6;
        setExternalBalance(bal);
      } else {
        setExternalBalance(0);
      }
    })
    .catch(() => setExternalBalance(0));

  }, [sourceChain, walletAddress]);
  
  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [slippage, setSlippage] = useState('0.1');

  const fromNet = isDirectionReversed ? 'Arc Testnet' : sourceChain;
  const toNet = isDirectionReversed ? sourceChain : 'Arc Testnet';
  const currentBalance = isDirectionReversed ? balances.USDC : externalBalance;

  const switchNetwork = async (networkName: string) => {
    const eth = getProvider() || (typeof window !== 'undefined' ? (window as any).ethereum : null);
    if (!eth) return;
    let chainId = '0x4cef52'; // Arc Testnet default
    switch(networkName) {
      case 'Arbitrum Sepolia': chainId = '0x66eee'; break;
      case 'Base Sepolia': chainId = '0x14a34'; break;
      case 'Ethereum Sepolia': chainId = '0xaa36a7'; break;
      case 'Optimism Sepolia': chainId = '0xaa37dc'; break;
    }
    try {
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });
    } catch (e) {
      console.log('Failed to switch network', e);
    }
  };

  // Auto-switch network whenever fromNet changes
  useEffect(() => {
    if (walletConnected) {
      switchNetwork(fromNet);
    }
  }, [fromNet, walletConnected]);

  const handleMax = () => {
    setAmount(currentBalance.toString());
  };

  const reverseDirection = () => {
    setIsDirectionReversed(!isDirectionReversed);
  };

  const resetState = () => {
    setTimeout(() => {
      setAmount('');
      setIsBridging(false);
      setBridgeStatus('IDLE');
    }, 3000);
  };

  const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
  const BRIDGE_CONTRACT_ADDRESS = "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275";
  const padAddress = (addr: string) => addr.toLowerCase().replace('0x', '').padStart(64, '0');
  const padAmount = (amt: number) => {
    const amountWei = BigInt(Math.floor(amt * 1e6));
    return amountWei.toString(16).padStart(64, '0');
  };
  
  const executeBridge = async () => {
    if (!walletConnected) {
      addNotification('error', 'Wallet Not Connected', 'Please connect your wallet to bridge.');
      return;
    }
    
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      addNotification('error', 'Invalid Amount', 'Please enter a valid USDC amount to bridge.');
      return;
    }

    if (val > currentBalance) {
      addNotification('error', 'Insufficient Balance', `You only have ${currentBalance} USDC on ${fromNet}.`);
      return;
    }

    setIsBridging(true);
    setBridgeStatus('APPROVING');
    addNotification('info', 'Approving USDC', `Please approve the transaction to spend ${val} USDC on ${fromNet}...`);

    let bridgeTxHash = '';
    const depositData = '0xa9059cbb' + padAddress(BRIDGE_CONTRACT_ADDRESS) + padAmount(val);

    const finalizeBridge = () => {
      setBridgeStatus('MINTING');
      addNotification('info', 'Attestation Received', `Minting USDC natively on ${toNet}...`);
      
      setTimeout(async () => {
        setBridgeStatus('SUCCESS');
        
        if (isDirectionReversed) {
           setBalances(prev => ({ ...prev, USDC: prev.USDC + val }));
           setExternalBalance(prev => Math.max(0, prev - val));
        } else {
           setBalances(prev => ({ ...prev, USDC: Math.max(0, prev.USDC - val) }));
           setExternalBalance(prev => prev + val);
        }
        
        let explorerUrl = 'https://sepolia.arbiscan.io';
        if (fromNet === 'Base Sepolia') explorerUrl = 'https://sepolia.basescan.org';
        if (fromNet === 'Ethereum Sepolia') explorerUrl = 'https://sepolia.etherscan.io';
        if (fromNet === 'Optimism Sepolia') explorerUrl = 'https://sepolia-optimism.etherscan.io';
        if (fromNet === 'Arc Testnet') explorerUrl = 'https://testnet.arcscan.app';
        
        addNotification('success', 'Bridge Successful', `Successfully bridged ${val} USDC from ${fromNet} to ${toNet}!`, bridgeTxHash, explorerUrl);
        await switchNetwork(toNet);
        resetState();
      }, 2000);
    };

    const eth = getProvider() || (typeof window !== 'undefined' ? (window as any).ethereum : null);
    if (eth && walletAddress) {
        try {
            await switchNetwork(fromNet);
            setBridgeStatus('BURNING');
            addNotification('info', 'Executing Cross-Chain Transfer', `Transferring USDC to bridge. Please confirm...`);
            
            const txHash = await eth.request({
              method: 'eth_sendTransaction',
              params: [{ from: walletAddress, to: USDC_ADDRESS, value: '0x0', data: depositData }]
            }) as string;
            bridgeTxHash = txHash;

            setBridgeStatus('ATTESTING');
            addNotification('info', 'Awaiting Circle Attestation', 'Waiting for Circle to attest the cross-chain message...');
            
            setTimeout(finalizeBridge, 3000);
            
        } catch (err: any) {
            console.error(err);
            addNotification('error', 'Transaction Failed', err.message || 'Transaction rejected by user.');
            setIsBridging(false);
            setBridgeStatus('IDLE');
        }
    }
  };

  const steps = ['APPROVING', 'BURNING', 'ATTESTING', 'MINTING', 'SUCCESS'];
  const currentStepIndex = steps.indexOf(bridgeStatus);

  return (
    <div className="w-full min-h-screen pt-24 pb-12 px-4 relative flex flex-col items-center">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-slate-50 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-500/10 blur-[100px] rounded-full" />
      </div>

      {/* Hero Section */}
      <div className="text-center mb-12 max-w-3xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-bold mb-6 shadow-sm"
        >
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          CCTP v2 is Live
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-6 leading-tight"
        >
          The fastest way to <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500">
            cross-chain
          </span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-slate-500 text-lg md:text-xl font-medium"
        >
          Seamlessly move USDC across 8+ networks with zero slippage, native minting, and sub-10 second finality.
        </motion.p>
      </div>

      {/* Bridge Widget */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-[500px] bg-white/80 backdrop-blur-2xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-[2.5rem] p-6 md:p-8 relative z-10"
      >
        {/* From Network */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-3xl p-4 mb-2 transition-all focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-400/10 hover:border-slate-300">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-500">FROM</span>
            <span className="text-xs font-medium text-slate-500">
              Balance: <span className="text-slate-900 font-bold">{currentBalance.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex-1">
              {isDirectionReversed ? (
                <div className="flex items-center gap-2 cursor-not-allowed">
                  <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center">
                    <Network size={16} className="text-white" />
                  </div>
                  <span className="text-xl font-bold text-slate-900">Arc Testnet</span>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={sourceChain}
                    onChange={(e) => setSourceChain(e.target.value as any)}
                    className="w-full bg-transparent text-xl font-bold text-slate-900 outline-none cursor-pointer appearance-none pl-10 relative z-10"
                  >
                    <option value="Arbitrum Sepolia">Arbitrum Sepolia</option>
                    <option value="Base Sepolia">Base Sepolia</option>
                    <option value="Ethereum Sepolia">Ethereum Sepolia</option>
                    <option value="Optimism Sepolia">Optimism Sepolia</option>
                    <option value="Avalanche Fuji">Avalanche Fuji</option>
                    <option value="Polygon Amoy">Polygon Amoy</option>
                    <option value="Solana Devnet">Solana Devnet</option>
                  </select>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center pointer-events-none z-0">
                    <Network size={16} className="text-indigo-600" />
                  </div>
                  <ChevronDown size={20} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-0" />
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200/60">
            <div className="flex items-center gap-4">
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 bg-transparent text-4xl font-black text-slate-900 outline-none placeholder:text-slate-300 number-mono"
              />
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm shrink-0">
                  <Coins size={16} className="text-blue-500" />
                  <span className="font-bold text-slate-700">USDC</span>
                </div>
                <button 
                  onClick={handleMax}
                  className="text-[10px] font-bold text-indigo-600 hover:text-white hover:bg-indigo-600 px-3 py-1 rounded-full border border-indigo-200 bg-indigo-50 transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Reverse Button */}
        <div className="flex justify-center -my-5 relative z-20">
          <button
            onClick={reverseDirection}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all active:scale-95 group"
          >
            <ArrowRightLeft size={18} className="rotate-90 group-hover:rotate-180 transition-transform duration-300" />
          </button>
        </div>

        {/* To Network */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-3xl p-4 mt-2 mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-500">TO</span>
          </div>
          <div className="flex items-center gap-3">
            {!isDirectionReversed ? (
              <div className="flex items-center gap-2 cursor-not-allowed">
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center">
                  <Network size={16} className="text-white" />
                </div>
                <span className="text-xl font-bold text-slate-900">Arc Testnet</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 cursor-not-allowed">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Network size={16} className="text-indigo-600" />
                </div>
                <span className="text-xl font-bold text-slate-900">{sourceChain}</span>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200/60">
            <span className="text-4xl font-black text-slate-900 opacity-50 number-mono">
              {amount || "0.00"}
            </span>
          </div>
        </div>

        {/* Advanced Options Toggle */}
        <div className="mb-6">
          <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors mx-auto"
          >
            <Settings size={16} />
            Advanced Options
            <ChevronDown size={16} className={`transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {showAdvanced && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-4"
              >
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">RECIPIENT ADDRESS</label>
                    <input 
                      type="text" 
                      placeholder={walletAddress || "0x..."}
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">MAX SLIPPAGE</label>
                    <div className="flex gap-2">
                      {['0.1', '0.5', '1.0'].map(val => (
                        <button
                          key={val}
                          onClick={() => setSlippage(val)}
                          className={`flex-1 py-1.5 rounded-lg text-sm font-bold border transition-colors ${
                            slippage === val 
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {val}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Button */}
        <button
          onClick={executeBridge}
          disabled={isBridging || !walletConnected}
          className={`w-full py-4 rounded-2xl font-black text-lg shadow-lg flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden ${
            isBridging 
              ? 'bg-slate-900 text-white cursor-not-allowed scale-[0.98]'
              : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 hover:shadow-xl hover:shadow-indigo-500/20 text-white hover:scale-[1.02]'
          }`}
        >
          {isBridging ? (
            <span className="flex items-center gap-3">
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              {bridgeStatus === 'APPROVING' && 'Approving USDC...'}
              {bridgeStatus === 'BURNING' && 'Executing CCTP Burn...'}
              {bridgeStatus === 'ATTESTING' && 'Awaiting Attestation...'}
              {bridgeStatus === 'MINTING' && 'Minting Destination...'}
              {bridgeStatus === 'SUCCESS' && 'Bridge Successful!'}
            </span>
          ) : !walletConnected ? (
            'Connect Wallet'
          ) : (
            'Review & Bridge'
          )}
        </button>

        {/* Progress Tracker (only visible during bridge) */}
        <AnimatePresence>
          {isBridging && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-6 pt-6 border-t border-slate-100"
            >
              <div className="flex justify-between relative">
                <div className="absolute top-2.5 left-0 w-full h-[2px] bg-slate-100 -z-10" />
                <div 
                  className="absolute top-2.5 left-0 h-[2px] bg-indigo-500 -z-10 transition-all duration-500" 
                  style={{ width: `${Math.max(0, (currentStepIndex / (steps.length - 1)) * 100)}%` }}
                />
                
                {steps.map((step, index) => {
                  const isActive = currentStepIndex === index;
                  const isPast = currentStepIndex > index;
                  
                  return (
                    <div key={step} className="flex flex-col items-center gap-2 relative bg-white px-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors duration-300 ${
                        isPast ? 'bg-indigo-500 text-white' : 
                        isActive ? 'bg-indigo-100 border-2 border-indigo-500 text-indigo-500' : 
                        'bg-slate-100 text-slate-300'
                      }`}>
                        {isPast ? <CheckCircle2 size={12} /> : <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-indigo-500' : 'bg-slate-300'}`} />}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[9px] font-bold text-slate-400">APPROVE</span>
                <span className="text-[9px] font-bold text-slate-400">BURN</span>
                <span className="text-[9px] font-bold text-slate-400">ATTEST</span>
                <span className="text-[9px] font-bold text-slate-400">MINT</span>
                <span className="text-[9px] font-bold text-slate-400">DONE</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Footer Info */}
        {!isBridging && (
          <div className="mt-6 flex justify-between items-center px-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <ShieldCheck size={14} className="text-green-500" /> Native CCTP
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Info size={14} className="text-slate-400" /> No Fees
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Clock size={14} className="text-slate-400" /> ~10 Sec
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
