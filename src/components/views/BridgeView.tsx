'use client';

import React, { useState, useEffect } from 'react';
import { useAppState } from '@/context/useAppState';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, Coins, Network, ShieldCheck, Clock, ExternalLink, Zap, Settings2, Code, ArrowRightLeft, Vault } from 'lucide-react';

export default function BridgeView() {
  const { walletConnected, addNotification, balances, setBalances, claimFaucet, getProvider, walletAddress } = useAppState();

  const [sourceChain, setSourceChain] = useState<'Arbitrum Sepolia' | 'Base Sepolia' | 'Ethereum Sepolia'>('Arbitrum Sepolia');
  const [amount, setAmount] = useState<string>('');
  const [isBridging, setIsBridging] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<'IDLE' | 'APPROVING' | 'BURNING' | 'ATTESTING' | 'MINTING' | 'HOOK' | 'SUCCESS'>('IDLE');
  const [isDirectionReversed, setIsDirectionReversed] = useState(false);
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

  const handleMax = () => {
    setAmount(balances.USDC.toString());
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

    const fromNet = isDirectionReversed ? 'Arc Testnet' : sourceChain;
    const toNet = isDirectionReversed ? sourceChain : 'Arc Testnet';
    const currentBalance = isDirectionReversed ? balances.USDC : externalBalance;

    if (val > currentBalance) {
      addNotification('error', 'Insufficient Balance', `You only have ${currentBalance} USDC on ${fromNet}.`);
      return;
    }

    setIsBridging(true);
    setBridgeStatus('APPROVING');
    addNotification('info', 'Approving USDC', `Please approve the transaction in MetaMask to spend ${val} USDC on ${fromNet}...`);

    const eth = getProvider();
    let bridgeTxHash = '';
    
    const switchNetwork = async (networkName: string) => {
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

    const resetState = () => {
        setAmount('');
        setTimeout(() => {
            setIsBridging(false);
            setBridgeStatus('IDLE');
        }, 3000);
    };

    const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
    const BRIDGE_CONTRACT_ADDRESS = "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275";
    const padAddress = (addr: string) => addr.toLowerCase().replace('0x', '').padStart(64, '0');
    const padAmount = (amount: number) => {
      const amountWei = BigInt(Math.floor(amount * 1e6));
      return amountWei.toString(16).padStart(64, '0');
    };
    
    const getDomain = (chain: string) => {
      switch(chain) {
        case 'Arbitrum Sepolia': return 3;
        case 'Base Sepolia': return 6;
        case 'Ethereum Sepolia': return 0;
        case 'Optimism Sepolia': return 2;
        case 'Avalanche Fuji': return 1;
        case 'Polygon Amoy': return 7;
        case 'Solana Devnet': return 5;
        default: return 0;
      }
    };

    const destDomain = getDomain(toNet);
    const depositData = '0xa9059cbb' + 
      padAddress(BRIDGE_CONTRACT_ADDRESS) + 
      padAmount(val);

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
    } else {
        const winEth = typeof window !== 'undefined' ? (window as any).ethereum : null;
        if (winEth && walletAddress) {
            try {
                await switchNetwork(fromNet);
                setBridgeStatus('BURNING');
                addNotification('info', 'Executing Cross-Chain Transfer', `Transferring USDC to bridge. Please confirm...`);
                const txHash = await winEth.request({ method: 'eth_sendTransaction', params: [{ from: walletAddress, to: USDC_ADDRESS, value: '0x0', data: depositData }]}) as string;
                bridgeTxHash = txHash;
                setBridgeStatus('ATTESTING');
                addNotification('info', 'Awaiting Circle Attestation', 'Waiting for Circle to attest...');
                setTimeout(finalizeBridge, 3000);
            } catch (err: any) {
                console.error(err);
                addNotification('error', 'Transaction Failed', err.message || 'Transaction rejected by user.');
                setIsBridging(false);
                setBridgeStatus('IDLE');
            }
        } else {
            setTimeout(() => {
              setBridgeStatus('BURNING');
              addNotification('info', 'Executing Cross-Chain Transfer', `Burning USDC on ${fromNet} via CCTP...`);
              
              setTimeout(() => {
                setBridgeStatus('ATTESTING');
                addNotification('info', 'Awaiting Circle Attestation', 'Waiting for Circle to attest the cross-chain message...');
                
                const waitTime = 3000;
                setTimeout(finalizeBridge, waitTime);
              }, 2000);
            }, 2000);
        }
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center py-12 px-4 overflow-auto bg-slate-50">
      <div className="text-center mb-10 max-w-2xl">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">
          NATIVE BRIDGE
        </h1>
        <p className="text-slate-500 text-lg leading-relaxed font-light">
          Move USDC instantly to Arc Testnet using Circle's CCTP v2. 
          Experience <span className="font-semibold text-slate-900">Fast Transfers</span> and programmable <span className="font-semibold text-slate-900">Hooks</span>.
        </p>
      </div>

      <div className="w-full max-w-[900px] flex flex-col md:flex-row gap-6 items-start justify-center">
        <div className="w-full md:flex-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 relative overflow-visible"
          >
            <div className={`mb-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 transition-colors relative overflow-hidden`}>
            <div className="flex justify-between items-center mb-3 relative z-10">
              <span className={`text-xs font-bold text-slate-500 tracking-wider`}>FROM NETWORK</span>
              <span className="text-xs text-slate-500 font-medium">Balance: <span className="text-slate-900">{(isDirectionReversed ? balances.USDC : externalBalance).toLocaleString(undefined, {maximumFractionDigits:2})} USDC</span></span>
            </div>
            
            {isDirectionReversed ? (
               <div className="flex items-center gap-2 relative z-10">
                 <Network size={20} className="text-[#8b5cf6]" />
                 <span className="text-xl font-bold text-slate-900">Arc Testnet</span>
               </div>
            ) : (
              <select
                value={sourceChain}
                onChange={(e) => setSourceChain(e.target.value as any)}
                className="w-full bg-transparent text-xl font-bold text-slate-900 outline-none cursor-pointer appearance-none relative z-10"
              >
                <option value="Arbitrum Sepolia" className="bg-white text-slate-900">Arbitrum Sepolia</option>
                <option value="Base Sepolia" className="bg-white text-slate-900">Base Sepolia</option>
                <option value="Ethereum Sepolia" className="bg-white text-slate-900">Ethereum Sepolia</option>
                <option value="Optimism Sepolia" className="bg-white text-slate-900">Optimism Sepolia</option>
              </select>
            )}
          </div>

          <div className="flex justify-center -my-3 relative z-10">
            <div onClick={() => setIsDirectionReversed(!isDirectionReversed)} className="bg-white border border-slate-200 p-2 rounded-xl text-slate-400 hover:text-[#8b5cf6] hover:rotate-180 transition-all duration-300 cursor-pointer shadow-sm">
              <ArrowDown size={20} className={isDirectionReversed ? "rotate-180" : ""} />
            </div>
          </div>

          <div className={`mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 relative overflow-hidden`}>
            <div className="flex justify-between items-center mb-3 relative z-10">
              <span className={`text-xs font-bold text-slate-500 tracking-wider`}>TO NETWORK</span>
              <span className="text-xs text-slate-500 font-medium">Balance: <span className="text-slate-900">{(isDirectionReversed ? externalBalance : balances.USDC).toLocaleString(undefined, {maximumFractionDigits:2})} USDC</span></span>
            </div>
            
            {isDirectionReversed ? (
              <select
                value={sourceChain}
                onChange={(e) => setSourceChain(e.target.value as any)}
                className="w-full bg-transparent text-xl font-bold text-slate-900 outline-none cursor-pointer appearance-none relative z-10"
              >
                <option value="Arbitrum Sepolia" className="bg-white text-slate-900">Arbitrum Sepolia</option>
                <option value="Base Sepolia" className="bg-white text-slate-900">Base Sepolia</option>
                <option value="Ethereum Sepolia" className="bg-white text-slate-900">Ethereum Sepolia</option>
                <option value="Optimism Sepolia" className="bg-white text-slate-900">Optimism Sepolia</option>
              </select>
            ) : (
              <div className="flex items-center gap-2 relative z-10">
                <Network size={20} className="text-[#8b5cf6]" />
                <span className="text-xl font-bold text-slate-900">Arc Testnet</span>
              </div>
            )}
          </div>

          <div className="mb-6 p-4 rounded-2xl bg-white border border-slate-200 focus-within:border-[#8b5cf6]/50 focus-within:ring-2 focus-within:ring-[#8b5cf6]/10 transition-all shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-500 tracking-wider">YOU SEND</span>
              <button 
                onClick={handleMax}
                className="text-[10px] font-bold text-[#8b5cf6] hover:text-white hover:bg-[#8b5cf6] px-2 py-0.5 rounded-full border border-[#8b5cf6]/50 transition-colors"
              >
                MAX
              </button>
            </div>
            <div className="flex items-center">
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent text-3xl font-black text-slate-900 outline-none placeholder:text-slate-300 number-mono"
              />
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm shrink-0">
                <Coins size={16} className="text-[#8b5cf6]" />
                <span className="font-bold text-slate-700">USDC</span>
              </div>
            </div>
          </div>

          <button
            onClick={executeBridge}
            disabled={isBridging || !walletConnected}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-sm flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden ${
              isBridging 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white'
            }`}
          >
            {isBridging && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full translate-x-[-100%] animate-[shimmer_1.5s_infinite]"></div>
            )}
            
            {isBridging ? (
              <span className="flex items-center gap-2 relative z-10">
                <span className="w-5 h-5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                {bridgeStatus === 'APPROVING' && 'Approving...'}
                {bridgeStatus === 'BURNING' && 'Burning USDC...'}
                {bridgeStatus === 'ATTESTING' && 'Awaiting Attestation...'}
                {bridgeStatus === 'MINTING' && 'Minting on Arc...'}
                {bridgeStatus === 'HOOK' && 'Executing Hook...'}
                {bridgeStatus === 'SUCCESS' && 'Success!'}
              </span>
            ) : !walletConnected ? (
              'Connect Wallet to Bridge'
            ) : (
              'Bridge Now'
            )}
          </button>
          
          <div className="mt-6 pt-5 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <ShieldCheck size={14} className="text-[#8b5cf6]" />
              <span>Native CCTP v2</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={14} className="text-slate-400" />
              <span>~ 10 Secs</span>
            </div>
          </div>
          {isBridging && (
            <div className="mt-4 text-center">
              <span className="text-sm text-slate-500 font-medium">Status: <span className="text-slate-900 font-bold">{bridgeStatus}</span></span>
            </div>
          )}
        </motion.div>
        </div>

        {/* Right Column - Route Details */}
        <div className="w-full md:w-[400px]">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 relative overflow-visible"
          >
            <h2 className="text-lg font-bold text-slate-900 mb-6 tracking-tight">Route Details</h2>
            
            <div className="space-y-4">
               {/* Expected Output */}
               <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                 <span className="text-sm font-medium text-slate-500">Expected Output</span>
                 <span className="text-base font-bold text-slate-900">{amount ? parseFloat(amount).toLocaleString(undefined, {maximumFractionDigits:4}) : '0'} USDC</span>
               </div>
               
               {/* Via */}
               <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                 <span className="text-sm font-medium text-slate-500">Via</span>
                 <span className="text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">CCTP V2</span>
               </div>
               
               {/* Route */}
               <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                 <span className="text-sm font-medium text-slate-500">Route</span>
                 <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                   {isDirectionReversed ? sourceChain.split(' ')[0] : 'Arc'} <ArrowRightLeft className="w-3 h-3 text-slate-400" /> {isDirectionReversed ? 'Arc' : sourceChain.split(' ')[0]}
                 </div>
               </div>
               
               {/* Estimated Time */}
               <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                 <span className="text-sm font-medium text-slate-500">Estimated Time</span>
                 <span className="text-sm font-semibold text-slate-900">~ 15 - 20s</span>
               </div>
               
               {/* Est. Network Fee */}
               <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                 <span className="text-sm font-medium text-slate-500">Est. Network Fee</span>
                 <div className="text-right">
                   <div className="text-xs text-slate-500 font-medium">Approve: Free</div>
                   <div className="text-xs text-slate-500 font-medium mt-1">Burn: Network Fee</div>
                   <div className="text-xs text-slate-500 font-medium mt-1">Mint: Network Fee</div>
                 </div>
               </div>
               
               {/* Platform Fee */}
               <div className="flex justify-between items-center pt-2">
                 <span className="text-sm font-medium text-slate-500">Platform Fee</span>
                 <span className="text-sm font-bold text-green-500">$0</span>
               </div>
            </div>
          </motion.div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
