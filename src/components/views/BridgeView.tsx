import React, { useState } from 'react';
import { useAppState } from '@/context/useAppState';
import { Network, Link as LinkIcon, ArrowDown, ExternalLink, ShieldAlert, CheckCircle2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type BridgeStep = 'INPUT' | 'BURNING' | 'ATTESTING' | 'MINTING' | 'SUCCESS';

export default function BridgeView() {
  const { walletConnected, balances, connectWallet } = useAppState();
  const [step, setStep] = useState<BridgeStep>('INPUT');
  const [amount, setAmount] = useState('');
  const [sourceChain, setSourceChain] = useState('Ethereum Sepolia');
  const [destChain, setDestChain] = useState('Arc Testnet');
  const [txHash, setTxHash] = useState('');

  const handleMax = () => {
    setAmount(balances.walletUSDC ? balances.walletUSDC.toString() : '0');
  };

  const executeBridge = async () => {
    if (!walletConnected || !amount || Number(amount) <= 0) return;
    
    // Simulate CCTP Bridge Flow
    setStep('BURNING');
    await new Promise(r => setTimeout(r, 2500)); // Simulate Burn
    
    setStep('ATTESTING');
    await new Promise(r => setTimeout(r, 3500)); // Simulate Circle API Polling
    
    setStep('MINTING');
    await new Promise(r => setTimeout(r, 2000)); // Simulate Mint on Destination
    
    setTxHash('0x' + Math.random().toString(16).slice(2, 66).padStart(64, '0'));
    setStep('SUCCESS');
  };

  const resetBridge = () => {
    setStep('INPUT');
    setAmount('');
    setTxHash('');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#030304] custom-scrollbar">
      <div className="max-w-7xl mx-auto px-4 py-8 lg:px-8">
        
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-[#3b82f6]/20 to-[#8b5cf6]/20 border border-[#8b5cf6]/30 mb-4 shadow-[0_0_30px_rgba(139,92,246,0.15)]">
            <LinkIcon size={32} className="text-[#8b5cf6]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Cross-Chain Bridge</h1>
          <p className="text-[#8e8e9f] max-w-xl mx-auto text-sm leading-relaxed">
            Natively bridge USDC across networks using Circle's Cross-Chain Transfer Protocol (CCTP) with zero slippage.
          </p>
        </div>

        {/* Bridge Widget */}
        <div className="max-w-md mx-auto relative z-10">
          <div className="bg-[#09090c]/80 backdrop-blur-xl border border-[#13131a] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[100px] bg-gradient-to-b from-[#8b5cf6]/10 to-transparent blur-3xl -z-10" />

            <AnimatePresence mode="wait">
              {step === 'INPUT' ? (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  
                  {/* Source Chain */}
                  <div className="p-4 rounded-2xl bg-[#13131a]/50 border border-[#1c1c28]">
                    <div className="flex justify-between text-xs text-[#8e8e9f] mb-3">
                      <span>From Network</span>
                      <span>Balance: {balances.walletUSDC ? balances.walletUSDC.toFixed(2) : '0.00'} USDC</span>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <button className="flex items-center gap-2 bg-[#1c1c28] hover:bg-[#252533] px-3 py-2 rounded-xl text-white font-medium text-sm transition-colors border border-transparent hover:border-[#3b82f6]/30">
                        <Network size={16} className="text-[#3b82f6]" />
                        {sourceChain}
                        <ChevronDown size={14} className="text-[#8e8e9f]" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <input
                          type="number"
                          placeholder="0.0"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full bg-transparent text-3xl font-bold text-white placeholder-[#252533] outline-none number-mono"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={handleMax}
                          className="px-2 py-1 text-[10px] font-bold text-[#8b5cf6] bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 rounded-lg transition-colors"
                        >
                          MAX
                        </button>
                        <div className="flex items-center gap-1.5 bg-[#1c1c28] px-3 py-1.5 rounded-xl border border-[#252533]">
                          <div className="w-5 h-5 rounded-full bg-[#2775ca] flex items-center justify-center font-bold text-white text-[10px]">USDC</div>
                          <span className="font-bold text-sm text-white">USDC</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Swap Direction Arrow */}
                  <div className="flex justify-center -my-2 relative z-10">
                    <button className="bg-[#13131a] hover:bg-[#1c1c28] border border-[#252533] p-2 rounded-xl text-[#8e8e9f] hover:text-white transition-colors shadow-lg">
                      <ArrowDown size={18} />
                    </button>
                  </div>

                  {/* Destination Chain */}
                  <div className="p-4 rounded-2xl bg-[#13131a]/50 border border-[#1c1c28]">
                    <div className="flex justify-between text-xs text-[#8e8e9f] mb-3">
                      <span>To Network (Est.)</span>
                      <span>Balance: {balances.USDC ? balances.USDC.toFixed(2) : '0.00'} USDC</span>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <button className="flex items-center gap-2 bg-[#1c1c28] hover:bg-[#252533] px-3 py-2 rounded-xl text-white font-medium text-sm transition-colors border border-transparent hover:border-[#8b5cf6]/30">
                        <Network size={16} className="text-[#8b5cf6]" />
                        {destChain}
                        <ChevronDown size={14} className="text-[#8e8e9f]" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          readOnly
                          value={amount || '0.0'}
                          className="w-full bg-transparent text-3xl font-bold text-white outline-none number-mono"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-[#1c1c28] px-3 py-1.5 rounded-xl border border-[#252533]">
                          <div className="w-5 h-5 rounded-full bg-[#2775ca] flex items-center justify-center font-bold text-white text-[10px]">USDC</div>
                          <span className="font-bold text-sm text-white">USDC</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    {!walletConnected ? (
                      <button
                        onClick={() => connectWallet('metamask')}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-[#3b82f6]/10 to-[#8b5cf6]/10 border border-[#8b5cf6]/30 hover:border-[#8b5cf6]/70 text-[#8b5cf6] hover:text-white text-sm font-bold transition-all"
                      >
                        Connect Wallet to Bridge
                      </button>
                    ) : (
                      <button
                        onClick={executeBridge}
                        disabled={!amount || Number(amount) <= 0}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:from-[#4f8ff7] hover:to-[#996cf7] text-white text-sm font-bold transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Bridge USDC
                      </button>
                    )}
                  </div>
                </motion.div>
              ) : step === 'SUCCESS' ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-8 flex flex-col items-center justify-center text-center space-y-6"
                >
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50">
                    <CheckCircle2 size={40} className="text-emerald-400" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Bridge Successful!</h3>
                    <p className="text-[#8e8e9f] text-sm">
                      Successfully bridged <span className="text-white font-bold">{amount} USDC</span><br/>
                      from {sourceChain} to {destChain}.
                    </p>
                  </div>

                  <div className="w-full space-y-3 pt-4">
                    <a
                      href={`https://testnet.arcscan.app/tx/${txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#1c1c28] hover:bg-[#252533] text-white text-sm font-semibold transition-colors"
                    >
                      View on Explorer <ExternalLink size={16} />
                    </a>
                    
                    <button
                      onClick={resetBridge}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:from-[#4f8ff7] hover:to-[#996cf7] text-white text-sm font-bold transition-all"
                    >
                      Bridge More Assets
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-6 space-y-8"
                >
                  <h3 className="text-center text-lg font-bold text-white mb-6">Bridging Assets...</h3>
                  
                  <div className="relative pl-6 space-y-8">
                    {/* Progress Line */}
                    <div className="absolute left-7 top-4 bottom-4 w-0.5 bg-[#1c1c28]"></div>
                    
                    {/* Step 1: Burn */}
                    <div className="relative flex items-center gap-4 z-10">
                      <div className={`w-3 h-3 rounded-full ${step === 'BURNING' ? 'bg-[#3b82f6] shadow-[0_0_10px_#3b82f6] animate-pulse' : 'bg-emerald-500'}`} />
                      <div className="flex-1">
                        <div className={`text-sm font-bold ${step === 'BURNING' ? 'text-white' : 'text-[#8e8e9f]'}`}>
                          1. Burn on {sourceChain}
                        </div>
                        {step === 'BURNING' && (
                          <div className="text-xs text-[#3b82f6] mt-1 animate-pulse">Waiting for wallet signature...</div>
                        )}
                      </div>
                    </div>

                    {/* Step 2: Attest */}
                    <div className="relative flex items-center gap-4 z-10">
                      <div className={`w-3 h-3 rounded-full ${step === 'ATTESTING' ? 'bg-[#8b5cf6] shadow-[0_0_10px_#8b5cf6] animate-pulse' : step === 'MINTING' ? 'bg-emerald-500' : 'bg-[#1c1c28]'}`} />
                      <div className="flex-1">
                        <div className={`text-sm font-bold ${step === 'ATTESTING' ? 'text-white' : 'text-[#8e8e9f]'}`}>
                          2. Circle Attestation
                        </div>
                        {step === 'ATTESTING' && (
                          <div className="text-xs text-[#8b5cf6] mt-1 animate-pulse">Fetching cross-chain signature...</div>
                        )}
                      </div>
                    </div>

                    {/* Step 3: Mint */}
                    <div className="relative flex items-center gap-4 z-10">
                      <div className={`w-3 h-3 rounded-full ${step === 'MINTING' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse' : 'bg-[#1c1c28]'}`} />
                      <div className="flex-1">
                        <div className={`text-sm font-bold ${step === 'MINTING' ? 'text-white' : 'text-[#8e8e9f]'}`}>
                          3. Mint on {destChain}
                        </div>
                        {step === 'MINTING' && (
                          <div className="text-xs text-emerald-400 mt-1 animate-pulse">Minting native USDC...</div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Powered By Footer */}
            {step === 'INPUT' && (
              <div className="mt-6 flex items-center justify-center gap-2 text-[#8e8e9f]">
                <ShieldAlert size={14} />
                <span className="text-[10px] font-semibold tracking-widest uppercase">Powered by Circle CCTP</span>
              </div>
            )}
            
          </div>
        </div>

      </div>
    </div>
  );
}
