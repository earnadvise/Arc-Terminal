import React, { useState, useEffect } from 'react';
import { useAppState } from '@/context/useAppState';
import { RefreshCw, ChevronDown, ArrowDownUp, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppKit } from "@circle-fin/app-kit";
import { createEthersAdapterFromProvider } from "@circle-fin/adapter-ethers-v6";
import { ethers } from "ethers";

type BridgeStep = 'IDLE' | 'APPROVING' | 'BURNING' | 'ATTESTING' | 'MINTING' | 'SUCCESS' | 'ERROR';

export default function BridgeView() {
  const { walletConnected, walletAddress, setBalances, balances, addNotification, getProvider } = useAppState();

  const [fromNet, setFromNet] = useState('Arc Testnet');
  const [toNet, setToNet] = useState('Arbitrum Sepolia');
  const [amount, setAmount] = useState('');
  
  const [isBridging, setIsBridging] = useState(false);
  const [step, setStep] = useState<BridgeStep>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentBalance, setCurrentBalance] = useState(0);

  // AppKit uses these official USDC contract addresses for testnets
  const USDC_ADDRESSES: Record<string, string> = {
    'Arbitrum Sepolia': '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    'Base Sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    'Ethereum Sepolia': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    'Optimism Sepolia': '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
    'Avalanche Fuji': '0x5425890298aed601595a70AB815c96711a31Bc65',
    'Polygon Amoy': '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
  };

  useEffect(() => {
    let active = true;
    const fetchBalance = async () => {
      if (!walletConnected || !walletAddress) {
        if (active) setCurrentBalance(0);
        return;
      }

      if (fromNet === 'Arc Testnet') {
        if (active) setCurrentBalance(balances.USDC || 0);
        return;
      }

      const usdcAddr = USDC_ADDRESSES[fromNet];
      const eth = getProvider() || (typeof window !== 'undefined' ? (window as any).ethereum : null);
      if (!eth || !usdcAddr) {
        if (active) setCurrentBalance(0);
        return;
      }

      try {
        const provider = new ethers.BrowserProvider(eth);
        const contract = new ethers.Contract(usdcAddr, ['function balanceOf(address) view returns (uint256)'], provider);
        const bal = await contract.balanceOf(walletAddress);
        if (active) {
          setCurrentBalance(Number(ethers.formatUnits(bal, 6))); // USDC has 6 decimals
        }
      } catch (e) {
        console.error('Failed to fetch balance', e);
        if (active) setCurrentBalance(0);
      }
    };
    
    fetchBalance();
    const interval = setInterval(fetchBalance, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [fromNet, walletConnected, walletAddress, balances.USDC, getProvider]);

  const handleMax = () => {
    setAmount((currentBalance || 0).toString());
  };

  const reverseDirection = () => {
    setFromNet(toNet);
    setToNet(fromNet);
  };

  const resetState = () => {
    setAmount('');
    setStep('IDLE');
    setErrorMessage('');
    setIsBridging(false);
  };

  const switchNetwork = async (networkName: string) => {
    const eth = getProvider() || (typeof window !== 'undefined' ? (window as any).ethereum : null);
    if (!eth) return;
    let chainId = '0x4cef52'; // Arc Testnet (5042002)
    switch(networkName) {
      case 'Arbitrum Sepolia': chainId = '0x66eee'; break; // 421614
      case 'Base Sepolia': chainId = '0x14a34'; break; // 84532
      case 'Ethereum Sepolia': chainId = '0xaa36a7'; break; // 11155111
      case 'Optimism Sepolia': chainId = '0xaa37dc'; break; // 11155420
      case 'Avalanche Fuji': chainId = '0xa869'; break; // 43113
      case 'Polygon Amoy': chainId = '0x13882'; break; // 80002
    }
    try {
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });
    } catch (e) {
      console.log('Failed to switch network', e);
    }
  };

  useEffect(() => {
    if (walletConnected) {
      switchNetwork(fromNet);
    }
  }, [fromNet, walletConnected]);

  const getAppKitChainName = (net: string) => {
    switch (net) {
      case 'Arbitrum Sepolia': return 'Arbitrum_Sepolia';
      case 'Base Sepolia': return 'Base_Sepolia';
      case 'Ethereum Sepolia': return 'Ethereum_Sepolia';
      case 'Optimism Sepolia': return 'OP_Sepolia';
      case 'Avalanche Fuji': return 'Avalanche_Fuji';
      case 'Polygon Amoy': return 'Polygon_Amoy';
      case 'Arc Testnet': return 'Arc_Testnet';
      default: return 'Arc_Testnet';
    }
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
      addNotification('error', 'Insufficient Balance', `You only have ${currentBalance.toFixed(4)} USDC on ${fromNet}.`);
      return;
    }

    setIsBridging(true);
    setStep('APPROVING');
    setErrorMessage('');

    const eth = getProvider() || (typeof window !== 'undefined' ? (window as any).ethereum : null);
    if (!eth) {
        addNotification('error', 'No Wallet', 'Please install MetaMask.');
        setIsBridging(false);
        setStep('IDLE');
        return;
    }

    try {
        console.log('[Bridge] Switching network to', fromNet);
        await switchNetwork(fromNet);

        console.log('[Bridge] Initializing App Kit adapter...');
        const adapter = await createEthersAdapterFromProvider({
            provider: eth
        });
        
        console.log('[Bridge] Creating AppKit instance...');
        const kit = new AppKit();
        
        kit.on("*", (payload: any) => {
            console.log('[AppKit Event]', payload);
            
            const method = payload?.method || payload?.values?.name;
            const state = payload?.values?.state;
            
            if (method === 'approve') setStep('APPROVING');
            if (method === 'burn') setStep('BURNING');
            if (method === 'fetchAttestation') setStep('ATTESTING');
            if (method === 'mint') setStep('MINTING');
        });

        const fromChain = getAppKitChainName(fromNet);
        const toChain = getAppKitChainName(toNet);

        let result = await kit.bridge({
            from: { adapter, chain: fromChain as any },
            to: { adapter, chain: toChain as any, useForwarder: true },
            amount: amount
        });

        console.log('[AppKit Result]', result);

        if (result.state === "error") {
             // AppKit retry fallback
             result = await kit.retryBridge(result as any, {
                 from: adapter,
                 to: adapter,
             });
        }

        if (result.state === "success") {
            setStep('SUCCESS');
            setBalances(prev => ({ ...prev, USDC: Math.max(0, prev.USDC - val) }));
            addNotification('success', 'Bridge Complete', 'USDC successfully bridged across chains!');
            setTimeout(() => resetState(), 3000);
        } else {
            throw new Error(result.error?.message || "Bridge failed to complete.");
        }

    } catch (err: any) {
        console.error(err);
        setStep('ERROR');
        setErrorMessage(err.message || 'Transaction rejected by user.');
        addNotification('error', 'Bridge Failed', err.message || 'Transaction rejected by user.');
        setIsBridging(false);
    }
  };

  const renderStep = (title: string, isActive: boolean, isDone: boolean) => (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors ${isActive ? 'bg-blue-50/50' : ''}`}>
      {isDone ? (
        <CheckCircle2 className="w-5 h-5 text-green-500" />
      ) : isActive ? (
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      ) : (
        <Circle className="w-5 h-5 text-slate-300" />
      )}
      <span className={`text-sm font-semibold ${isActive ? 'text-blue-600' : isDone ? 'text-slate-600' : 'text-slate-400'}`}>
        {title}
      </span>
    </div>
  );

  return (
    <div className="flex-1 w-full relative flex items-center justify-center p-4">
      {/* Background - Soft Purple/White Waves */}
      <div className="absolute inset-0 bg-[#f7f5ff] -z-10 overflow-hidden">
        <div className="absolute top-[0%] left-[10%] w-[60%] h-[60%] bg-[#e3dcff] blur-[100px] rounded-full opacity-60 mix-blend-multiply" />
        <div className="absolute bottom-[0%] right-[10%] w-[50%] h-[50%] bg-[#f0ebff] blur-[100px] rounded-full opacity-80 mix-blend-multiply" />
        <div className="absolute top-[20%] right-[30%] w-[40%] h-[40%] bg-white blur-[80px] rounded-full opacity-90" />
      </div>

      <div className="w-full max-w-[900px] flex gap-8 items-start justify-center">
        {/* Bridge Widget */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[420px] bg-white/70 backdrop-blur-xl rounded-[32px] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-white"
        >
          {/* Header */}
          <div className="flex justify-center items-center mb-6">
            <h2 className="text-[16px] font-bold text-slate-800 tracking-tight">Bridge USDC</h2>
          </div>

          <AnimatePresence mode="wait">
            {step === 'IDLE' || step === 'ERROR' ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {/* FROM CARD */}
                <div className="bg-white/80 rounded-[24px] p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative z-10 transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[13px] font-semibold text-slate-500">From</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-slate-400">
                        Balance: {(currentBalance || 0).toFixed(4)}
                      </span>
                      <button 
                        onClick={handleMax}
                        className="text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="relative rounded-[16px] bg-slate-50 border border-slate-100 hover:border-blue-100 transition-colors">
                      <select
                        value={fromNet}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === toNet) setToNet(fromNet);
                          setFromNet(val);
                        }}
                        className="w-full bg-transparent text-[15px] font-bold text-slate-800 outline-none cursor-pointer appearance-none px-4 py-3.5 relative z-10"
                      >
                        <option value="Arc Testnet">Arc Testnet</option>
                        <option value="Arbitrum Sepolia">Arbitrum Sepolia</option>
                        <option value="Base Sepolia">Base Sepolia</option>
                        <option value="Ethereum Sepolia">Ethereum Sepolia</option>
                        <option value="Optimism Sepolia">Optimism Sepolia</option>
                        <option value="Avalanche Fuji">Avalanche Fuji</option>
                        <option value="Polygon Amoy">Polygon Amoy</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-0" />
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-full px-3 py-1.5 shrink-0">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-[11px] font-bold">$</span>
                        </div>
                        <span className="font-bold text-slate-700 text-[15px]">USDC</span>
                      </div>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full min-w-0 flex-1 bg-transparent border-none px-2 py-1 text-4xl font-semibold text-right text-slate-800 outline-none placeholder:text-slate-200 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]"
                      />
                    </div>
                  </div>
                </div>

                {/* REVERSE ARROW */}
                <div className="flex justify-center -my-6 relative z-20 pointer-events-none">
                  <button
                    onClick={reverseDirection}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-md flex items-center justify-center text-slate-400 hover:text-blue-500 hover:scale-105 pointer-events-auto transition-all active:scale-95"
                  >
                    <ArrowDownUp size={16} />
                  </button>
                </div>

                {/* TO CARD */}
                <div className="bg-white/80 rounded-[24px] p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative z-10 transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[13px] font-semibold text-slate-500">To</span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="relative rounded-[16px] bg-slate-50 border border-slate-100 hover:border-blue-100 transition-colors">
                      <select
                        value={toNet}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === fromNet) setFromNet(toNet);
                          setToNet(val);
                        }}
                        className="w-full bg-transparent text-[15px] font-bold text-slate-800 outline-none cursor-pointer appearance-none px-4 py-3.5 relative z-10"
                      >
                        <option value="Arc Testnet">Arc Testnet</option>
                        <option value="Arbitrum Sepolia">Arbitrum Sepolia</option>
                        <option value="Base Sepolia">Base Sepolia</option>
                        <option value="Ethereum Sepolia">Ethereum Sepolia</option>
                        <option value="Optimism Sepolia">Optimism Sepolia</option>
                        <option value="Avalanche Fuji">Avalanche Fuji</option>
                        <option value="Polygon Amoy">Polygon Amoy</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-0" />
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-full px-3 py-1.5 shrink-0 opacity-80">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-[11px] font-bold">$</span>
                        </div>
                        <span className="font-bold text-slate-700 text-[15px]">USDC</span>
                      </div>
                      <input 
                        type="text" 
                        readOnly 
                        placeholder="0.00" 
                        value={amount} 
                        className="w-full min-w-0 flex-1 bg-transparent border-none px-2 py-1 text-4xl font-semibold text-right text-slate-800 outline-none placeholder:text-slate-200" 
                      />
                    </div>
                  </div>
                </div>

                {step === 'ERROR' && (
                  <div className="bg-red-50 text-red-600 text-sm font-medium p-3 rounded-xl border border-red-100">
                    {errorMessage}
                  </div>
                )}

                {/* ACTION BUTTON */}
                <div className="pt-2">
                   <button
                     onClick={executeBridge}
                     disabled={!walletConnected || !amount || parseFloat(amount) <= 0}
                     className={`w-full py-4 rounded-[20px] font-bold text-[16px] transition-all flex items-center justify-center gap-2 ${
                       !walletConnected || !amount || parseFloat(amount) <= 0
                         ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                         : 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0'
                     }`}
                   >
                     {!walletConnected ? (
                       'Connect Wallet'
                     ) : (
                       'Review & Bridge'
                     )}
                   </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="stepper"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_2px_20px_rgba(0,0,0,0.04)]"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                     {step === 'SUCCESS' ? (
                       <CheckCircle2 className="w-8 h-8 text-green-500" />
                     ) : (
                       <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                     )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {step === 'SUCCESS' ? 'Bridge Complete!' : 'Bridging in Progress'}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium mt-1">
                    {amount} USDC from {fromNet} to {toNet}
                  </p>
                </div>

                <div className="space-y-1">
                  {renderStep('Approve USDC', step === 'APPROVING', ['BURNING', 'ATTESTING', 'MINTING', 'SUCCESS'].includes(step))}
                  {renderStep('Burn on source chain', step === 'BURNING', ['ATTESTING', 'MINTING', 'SUCCESS'].includes(step))}
                  {renderStep('Circle Attestation', step === 'ATTESTING', ['MINTING', 'SUCCESS'].includes(step))}
                  {renderStep('Mint on destination', step === 'MINTING', step === 'SUCCESS')}
                </div>

                {step === 'SUCCESS' && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={resetState}
                    className="w-full mt-6 py-3.5 rounded-[16px] font-bold text-[15px] bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    Done
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
