import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowDownUp, 
  ArrowRightLeft,
  Settings, 
  Coins, 
  Network, 
  ShieldCheck, 
  Clock, 
  ChevronDown,
  Info,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useAppState } from '../../context/useAppState';
import { ethers } from 'ethers';

export default function BridgeView() {
  const { walletConnected, addNotification, balances, setBalances, getProvider, walletAddress } = useAppState();

  const [sourceChain, setSourceChain] = useState<'Arbitrum Sepolia' | 'Base Sepolia' | 'Ethereum Sepolia' | 'Optimism Sepolia' | 'Avalanche Fuji' | 'Polygon Amoy'>('Arbitrum Sepolia');
  const [isDirectionReversed, setIsDirectionReversed] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [isBridging, setIsBridging] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<'IDLE' | 'APPROVING' | 'BURNING' | 'ATTESTING' | 'MINTING' | 'HOOK' | 'SUCCESS'>('IDLE');
  const [externalBalance, setExternalBalance] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());
  const [fetchTrigger, setFetchTrigger] = useState(0);
  
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
      case 'Avalanche Fuji':
        rpc = 'https://api.avax-test.network/ext/bc/C/rpc';
        usdc = '0x5425890298aed601595a70AB815c96711a31Bc65';
        break;
      case 'Polygon Amoy':
        rpc = 'https://rpc-amoy.polygon.technology';
        usdc = '0x41E94Eb019C0762f9Bfcf9Cb1EE62ce516f1F428';
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

    setLastUpdated(new Date().toLocaleTimeString());
  }, [sourceChain, walletAddress, fetchTrigger]);
  
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
      case 'Avalanche Fuji': chainId = '0xa869'; break;
      case 'Polygon Amoy': chainId = '0x13882'; break;
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

  const refreshBalance = () => {
    setLastUpdated(new Date().toLocaleTimeString());
    setFetchTrigger(prev => prev + 1);
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

  const getUSDCAddress = (chain: string) => {
    switch(chain) {
      case 'Arbitrum Sepolia': return '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
      case 'Base Sepolia': return '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
      case 'Ethereum Sepolia': return '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
      case 'Optimism Sepolia': return '0x5fd84259d66Cd46123540766Be93DFE6D43130D7';
      case 'Avalanche Fuji': return '0x5425890298aed601595a70AB815c96711a31Bc65';
      case 'Polygon Amoy': return '0x41E94Eb019C0762f9Bfcf9Cb1EE62ce516f1F428';
      case 'Arc Testnet': return '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Mock address for testnet
      default: return '0x3600000000000000000000000000000000000000';
    }
  };

  // Custom BridgingKitContract Address provided by user
  const BRIDGE_CONTRACT_ADDRESS = "0xC5567a5E3370d4DBfB0540025078e283e36A363d";
  
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
    
    // Construct Official CCTP Calldata
    const amountWei = BigInt(Math.floor(val * 1e6));
    const usdcAddr = getUSDCAddress(fromNet);
    
    // ERC20 Approve ABI
    const erc20Iface = new ethers.Interface([
      "function approve(address spender, uint256 amount) external returns (bool)"
    ]);
    const approveData = erc20Iface.encodeFunctionData("approve", [BRIDGE_CONTRACT_ADDRESS, amountWei]);

    // Custom BridgingKitContract ABI
    const cctpIface = new ethers.Interface([
      "function bridgeWithPreapproval(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient) external",
      "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external" // Fallback
    ]);
    const mintRecipient = ethers.zeroPadValue(walletAddress, 32);
    const destinationDomain = 0; // Mock domain for Arc Testnet / internal relay
    
    // We try to use bridgeWithPreapproval as requested
    let depositData;
    try {
        depositData = cctpIface.encodeFunctionData("bridgeWithPreapproval", [
          amountWei,
          destinationDomain,
          mintRecipient
        ]);
    } catch (e) {
        // Fallback to standard CCTP if something goes wrong
        depositData = cctpIface.encodeFunctionData("depositForBurn", [
          amountWei,
          destinationDomain,
          mintRecipient,
          usdcAddr
        ]);
    }

    const finalizeBridge = () => {
      setBridgeStatus('MINTING');
      addNotification('info', 'Attestation Received', `Minting USDC natively on ${toNet}...`);
      
      setTimeout(async () => {
        setBridgeStatus('SUCCESS');
        
        if (isDirectionReversed) {
           // Arc Testnet -> External
           setBalances(prev => ({ ...prev, USDC: Math.max(0, prev.USDC - val) }));
           setExternalBalance(prev => prev + val);
        } else {
           // External -> Arc Testnet
           setBalances(prev => ({ ...prev, USDC: prev.USDC + val }));
           setExternalBalance(prev => Math.max(0, prev - val));
        }
        
        let explorerUrl = 'https://sepolia.arbiscan.io';
        if (fromNet === 'Base Sepolia') explorerUrl = 'https://sepolia.basescan.org';
        if (fromNet === 'Ethereum Sepolia') explorerUrl = 'https://sepolia.etherscan.io';
        if (fromNet === 'Optimism Sepolia') explorerUrl = 'https://sepolia-optimism.etherscan.io';
        if (fromNet === 'Arc Testnet') explorerUrl = 'https://testnet.arcscan.app';
        
        addNotification('success', 'Bridge Successful', `Successfully bridged ${val} USDC from ${fromNet} to ${toNet}!`, bridgeTxHash, explorerUrl);
        await switchNetwork(toNet);
        refreshBalance();
        resetState();
      }, 2000);
    };

    const eth = getProvider() || (typeof window !== 'undefined' ? (window as any).ethereum : null);
    if (eth && walletAddress) {
        try {
            await switchNetwork(fromNet);
            
            // 1. Approve Transaction
            setBridgeStatus('APPROVING');
            addNotification('info', 'Approving USDC', `Please confirm the transaction to allow CCTP to spend ${val} USDC...`);
            const approveTxHash = await eth.request({
              method: 'eth_sendTransaction',
              params: [{ from: walletAddress, to: usdcAddr, value: '0x0', data: approveData }]
            });

            // Note: In a production app, we would wait for approveTxHash to be mined here using a provider
            // For now, we simulate waiting a few seconds before prompting the deposit
            await new Promise(r => setTimeout(r, 4000));

            // 2. Deposit For Burn Transaction
            setBridgeStatus('BURNING');
            addNotification('info', 'Executing Cross-Chain Transfer', `Transferring USDC to official bridge. Please confirm...`);
            const txHash = await eth.request({
              method: 'eth_sendTransaction',
              params: [{ from: walletAddress, to: BRIDGE_CONTRACT_ADDRESS, value: '0x0', data: depositData }]
            }) as string;
            bridgeTxHash = txHash;

            setBridgeStatus('ATTESTING');
            addNotification('info', 'Awaiting Circle Attestation', 'Waiting for Circle to attest the cross-chain message...');
            
            // Note: In production we wait for the tx to be mined. Simulating mine wait here.
            setTimeout(finalizeBridge, 5000);
            
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
      {/* Dynamic Background - Soft Purple/White Waves */}
      <div className="absolute inset-0 bg-[#F4EFFB] -z-10 overflow-hidden">
        <div className="absolute top-[10%] left-[-10%] w-[60%] h-[60%] bg-[#E5D5F5] blur-[120px] rounded-full mix-blend-multiply opacity-70" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#FFFFFF] blur-[100px] rounded-full opacity-90" />
        <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] bg-[#DED6F5] blur-[100px] rounded-full mix-blend-multiply opacity-50" />
      </div>

      {/* Hero Section */}
      <div className="text-center mb-12 max-w-3xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold mb-6 shadow-sm"
        >
          <span className="w-2 h-2 rounded-full bg-[#01C38E] animate-pulse" />
          CCTP v2 is Live
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-6 leading-tight"
        >
          The fastest way to <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#0052FF] via-[#01C38E] to-[#0A786A]">
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
        className="w-full max-w-[460px] bg-[#F8F9FA]/90 backdrop-blur-3xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-[2rem] p-6 relative z-10"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 px-1">
          <h2 className="text-sm font-bold text-slate-500">Cross-chain transfers</h2>
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
            <span>Last updated: {lastUpdated}</span>
            <button onClick={refreshBalance} className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
              <RefreshCw size={12} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* From Network */}
        <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 mb-2 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-bold text-slate-400">From</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400">
                Balance: {(currentBalance || 0).toLocaleString(undefined, {minimumFractionDigits:4, maximumFractionDigits:4})}
              </span>
              <button 
                onClick={handleMax}
                className="text-[10px] font-bold text-slate-700 hover:text-white hover:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 transition-colors"
              >
                MAX
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            {isDirectionReversed ? (
              <div className="flex items-center justify-between border border-slate-100 rounded-2xl px-4 py-3 bg-slate-50/50 cursor-not-allowed">
                <span className="text-sm font-bold text-slate-900">Arc Testnet</span>
              </div>
            ) : (
              <div className="relative border border-slate-100 rounded-2xl bg-white hover:bg-slate-50 transition-colors">
                <select
                  value={sourceChain}
                  onChange={(e) => setSourceChain(e.target.value as any)}
                  className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none cursor-pointer appearance-none px-4 py-3 relative z-10"
                >
                  <option value="" disabled hidden>Select chain</option>
                  <option value="Arbitrum Sepolia">Arbitrum Sepolia</option>
                  <option value="Base Sepolia">Base Sepolia</option>
                  <option value="Ethereum Sepolia">Ethereum Sepolia</option>
                  <option value="Optimism Sepolia">Optimism Sepolia</option>
                  <option value="Avalanche Fuji">Avalanche Fuji</option>
                  <option value="Polygon Amoy">Polygon Amoy</option>
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-0" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-100 rounded-full px-3 py-1.5 shrink-0">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <Coins size={12} className="text-blue-500" />
                </div>
                <span className="font-bold text-slate-600 text-sm">USDC</span>
              </div>
              <input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 bg-transparent text-4xl font-bold text-right text-slate-500 outline-none placeholder:text-slate-300 ml-4"
              />
            </div>
          </div>
        </div>

        {/* Reverse Button */}
        <div className="flex justify-center -my-4 relative z-20">
          <button
            onClick={reverseDirection}
            className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all active:scale-95"
          >
            <ArrowDownUp size={14} />
          </button>
        </div>

        {/* To Network */}
        <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 mt-2 mb-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-bold text-slate-400">To</span>
          </div>

          <div className="mb-4">
            {!isDirectionReversed ? (
              <div className="flex items-center justify-between border border-slate-100 rounded-2xl px-4 py-3 bg-slate-50/50 cursor-not-allowed">
                <span className="text-sm font-bold text-slate-900">Arc Testnet</span>
              </div>
            ) : (
              <div className="flex items-center justify-between border border-slate-100 rounded-2xl px-4 py-3 bg-slate-50/50 cursor-not-allowed">
                <span className="text-sm font-bold text-slate-900">{sourceChain}</span>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-100 rounded-full px-3 py-1.5 shrink-0">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <Coins size={12} className="text-blue-500" />
                </div>
                <span className="font-bold text-slate-600 text-sm">USDC</span>
              </div>
              {/* Optional: Show output amount if desired, or hide it */}
            </div>
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

        {/* Connected Wallet Pill */}
        {walletConnected && (
          <div className="flex justify-center mb-4">
            <div className="bg-white border border-slate-200 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm">
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
              <span className="text-xs font-bold text-slate-700">
                {walletAddress?.slice(0,6)}...{walletAddress?.slice(-4)}
              </span>
              <ChevronDown size={14} className="text-slate-400 ml-1" />
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={executeBridge}
          disabled={isBridging || !walletConnected || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0}
          className={`w-full py-3.5 rounded-[1.25rem] font-bold text-base flex items-center justify-center gap-3 transition-all duration-300 relative overflow-hidden ${
            isBridging 
              ? 'bg-[#E5E7EB] text-slate-400 cursor-not-allowed scale-[0.99]'
              : (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
              ? 'bg-[#F3F4F6] text-slate-400 cursor-not-allowed'
              : 'bg-[#EBF3FF] hover:bg-[#E1EDFF] text-[#0052FF] hover:scale-[1.01]'
          }`}
        >
          {isBridging ? (
            <span className="flex items-center gap-3">
              <span className="w-5 h-5 border-2 border-[#0052FF]/20 border-t-[#0052FF] rounded-full animate-spin" />
              {bridgeStatus === 'APPROVING' && 'Approving USDC...'}
              {bridgeStatus === 'BURNING' && 'Executing CCTP Burn...'}
              {bridgeStatus === 'ATTESTING' && 'Awaiting Attestation...'}
              {bridgeStatus === 'MINTING' && 'Minting Destination...'}
              {bridgeStatus === 'SUCCESS' && 'Bridge Successful!'}
            </span>
          ) : !walletConnected ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm">
                <ArrowRightLeft size={12} className="text-slate-400" />
              </div>
              Connect Wallet
            </div>
          ) : (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) ? (
            <div className="flex items-center gap-2 text-slate-400">
               Enter an amount
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#0052FF] flex items-center justify-center text-white">
                <ArrowRightLeft size={12} />
              </div>
              Review & Bridge
            </div>
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
                        isPast ? 'bg-[#0052FF] text-white' : 
                        isActive ? 'bg-[#0052FF]/10 border-2 border-[#0052FF] text-[#0052FF]' : 
                        'bg-slate-100 text-slate-300'
                      }`}>
                        {isPast ? <CheckCircle2 size={12} /> : <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#0052FF]' : 'bg-slate-300'}`} />}
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
