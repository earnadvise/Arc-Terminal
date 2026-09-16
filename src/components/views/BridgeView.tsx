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

  const [fromNet, setFromNet] = useState('Arc Mainnet');
  const [toNet, setToNet] = useState('Arbitrum');
  const [amount, setAmount] = useState('');
  
  const [isBridging, setIsBridging] = useState(false);
  const [step, setStep] = useState<BridgeStep>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentBalance, setCurrentBalance] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<any[] | null>(null);

  // AppKit uses these official USDC contract addresses for mainnets
  const USDC_ADDRESSES: Record<string, string> = {
    'Arbitrum': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    'Base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    'Ethereum': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    'Optimism': '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    'Avalanche': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    'Polygon': '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  };

  useEffect(() => {
    let active = true;
    const fetchBalance = async () => {
      if (!walletConnected || !walletAddress) {
        if (active) setCurrentBalance(0);
        return;
      }

      if (fromNet === 'Arc Mainnet') {
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
    setCompletedSteps(null);
  };

  const switchNetwork = async (networkName: string) => {
    const eth = getProvider() || (typeof window !== 'undefined' ? (window as any).ethereum : null);
    if (!eth) return;
    let chainId = '0x13b2'; // Arc Mainnet (5042)
    switch(networkName) {
      case 'Arbitrum': chainId = '0xa4b1'; break; // 421614
      case 'Base': chainId = '0x2105'; break; // 84532
      case 'Ethereum': chainId = '0x1'; break; // 11155111
      case 'Optimism': chainId = '0xa'; break; // 11155420
      case 'Avalanche': chainId = '0xa86a'; break; // 43113
      case 'Polygon': chainId = '0x89'; break; // 80002
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

  const NETWORKS: any = {
    'Ethereum': { id: 1, usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
    'Optimism': { id: 10, usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' },
    'Polygon': { id: 137, usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
    'Arc Mainnet': { id: 5042, usdc: '0x3600000000000000000000000000000000000000' },
    'Base': { id: 8453, usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
    'Arbitrum': { id: 42161, usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
    'Avalanche': { id: 43114, usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' }
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
        addNotification('error', 'No Wallet', 'Please install a wallet like Rabby or MetaMask.');
        setIsBridging(false);
        setStep('IDLE');
        return;
    }

    try {
        console.log('[LI.FI] Switching network to', fromNet);
        await switchNetwork(fromNet);

        const provider = new ethers.BrowserProvider(eth);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const amountInWei = ethers.parseUnits(val.toString(), 6).toString(); // USDC has 6 decimals

        const fromChain = NETWORKS[fromNet];
        const toChain = NETWORKS[toNet];

        console.log('[LI.FI] Fetching quote...');
        const quoteUrl = `https://li.quest/v1/quote?fromChain=${fromChain.id}&toChain=${toChain.id}&fromToken=${fromChain.usdc}&toToken=${toChain.usdc}&fromAmount=${amountInWei}&fromAddress=${address}`;
        
        const quoteRes = await fetch(quoteUrl);
        const quoteData = await quoteRes.json();
        
        if (quoteData.message) {
            throw new Error(quoteData.message);
        }

        const txRequest = quoteData.transactionRequest;
        const approvalAddress = quoteData.estimate?.approvalAddress;

        if (approvalAddress) {
            console.log('[LI.FI] Checking allowance for', approvalAddress);
            const usdcContract = new ethers.Contract(fromChain.usdc, ['function allowance(address,address) view returns (uint256)', 'function approve(address,uint256)'], signer);
            const allowance = await usdcContract.allowance(address, approvalAddress);
            
            if (allowance < BigInt(amountInWei)) {
                setStep('APPROVING');
                console.log('[LI.FI] Approving USDC...');
                const tx = await usdcContract.approve(approvalAddress, amountInWei);
                await tx.wait();
            }
        }

        setStep('BURNING');
        console.log('[LI.FI] Executing route transaction...');
        
        const tx = await signer.sendTransaction({
            to: txRequest.to,
            data: txRequest.data,
            value: txRequest.value ? BigInt(txRequest.value) : 0n,
            gasLimit: txRequest.gasLimit ? BigInt(txRequest.gasLimit) : undefined
        });

        setStep('ATTESTING');
        console.log('[LI.FI] Waiting for transaction...', tx.hash);
        
        await tx.wait();
        
        setStep('SUCCESS');
        setBalances(prev => ({ ...prev, USDC: Math.max(0, prev.USDC - val) }));
        
        let explorerBase = 'https://arcscan.io/tx/';
        if (fromNet === 'Ethereum') explorerBase = 'https://etherscan.io/tx/';
        if (fromNet === 'Arbitrum') explorerBase = 'https://arbiscan.io/tx/';
        if (fromNet === 'Optimism') explorerBase = 'https://optimistic.etherscan.io/tx/';
        if (fromNet === 'Base') explorerBase = 'https://basescan.org/tx/';
        if (fromNet === 'Polygon') explorerBase = 'https://polygonscan.com/tx/';
        if (fromNet === 'Avalanche') explorerBase = 'https://snowtrace.io/tx/';

        setCompletedSteps([{ name: 'burn', txHash: tx.hash, explorerUrl: `${explorerBase}${tx.hash}` }] as any);
        addNotification('success', 'Bridge Complete', 'USDC successfully bridged via LI.FI!');
        setTimeout(() => resetState(), 10000);

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
      <span className={`text-sm font-semibold ${isActive ? 'text-blue-600' : isDone ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
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
        <div className="absolute top-[20%] right-[30%] w-[40%] h-[40%] bg-white dark:bg-[#13131a] blur-[80px] rounded-full opacity-90" />
      </div>

      <div className="w-full max-w-[900px] flex gap-8 items-start justify-center">
        {/* Bridge Widget */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[420px] bg-white dark:bg-[#13131a]/70 backdrop-blur-xl rounded-[32px] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-white"
        >
          {/* Header */}
          <div className="flex justify-center items-center mb-6">
            <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 tracking-tight">Bridge USDC</h2>
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
                <div className="bg-white dark:bg-[#13131a]/80 rounded-[24px] p-4 border border-slate-100 dark:border-[#1f1f2e] shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative z-10 transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[13px] font-semibold text-slate-500 dark:text-[#8a8a9e]">From</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-slate-400 dark:text-slate-500">
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
                    <div className="relative rounded-[16px] bg-slate-50 dark:bg-[#0c0c10] border border-slate-100 dark:border-[#1f1f2e] hover:border-blue-100 transition-colors">
                      <select
                        value={fromNet}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === toNet) setToNet(fromNet);
                          setFromNet(val);
                        }}
                        className="w-full bg-transparent text-[15px] font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer appearance-none px-4 py-3.5 relative z-10"
                      >
                        <option value="Arc Mainnet">Arc Mainnet</option>
                        <option value="Arbitrum">Arbitrum</option>
                        <option value="Base">Base</option>
                        <option value="Ethereum">Ethereum</option>
                        <option value="Optimism">Optimism</option>
                        <option value="Avalanche">Avalanche</option>
                        <option value="Polygon">Polygon</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none z-0" />
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-[#0c0c10] border border-slate-100 dark:border-[#1f1f2e] rounded-full px-3 py-1.5 shrink-0">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-[11px] font-bold">$</span>
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-200 text-[15px]">USDC</span>
                      </div>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full min-w-0 flex-1 bg-transparent border-none px-2 py-1 text-4xl font-semibold text-right text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-200 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]"
                      />
                    </div>
                  </div>
                </div>

                {/* REVERSE ARROW */}
                <div className="flex justify-center -my-6 relative z-20 pointer-events-none">
                  <button
                    onClick={reverseDirection}
                    className="w-10 h-10 rounded-xl bg-white dark:bg-[#13131a] border border-slate-100 dark:border-[#1f1f2e] shadow-md flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-blue-500 hover:scale-105 pointer-events-auto transition-all active:scale-95"
                  >
                    <ArrowDownUp size={16} />
                  </button>
                </div>

                {/* TO CARD */}
                <div className="bg-white dark:bg-[#13131a]/80 rounded-[24px] p-4 border border-slate-100 dark:border-[#1f1f2e] shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative z-10 transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[13px] font-semibold text-slate-500 dark:text-[#8a8a9e]">To</span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="relative rounded-[16px] bg-slate-50 dark:bg-[#0c0c10] border border-slate-100 dark:border-[#1f1f2e] hover:border-blue-100 transition-colors">
                      <select
                        value={toNet}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === fromNet) setFromNet(toNet);
                          setToNet(val);
                        }}
                        className="w-full bg-transparent text-[15px] font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer appearance-none px-4 py-3.5 relative z-10"
                      >
                        <option value="Arc Mainnet">Arc Mainnet</option>
                        <option value="Arbitrum">Arbitrum</option>
                        <option value="Base">Base</option>
                        <option value="Ethereum">Ethereum</option>
                        <option value="Optimism">Optimism</option>
                        <option value="Avalanche">Avalanche</option>
                        <option value="Polygon">Polygon</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none z-0" />
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-[#0c0c10] border border-slate-100 dark:border-[#1f1f2e] rounded-full px-3 py-1.5 shrink-0 opacity-80">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-[11px] font-bold">$</span>
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-200 text-[15px]">USDC</span>
                      </div>
                      <input 
                        type="text" 
                        readOnly 
                        placeholder="0.00" 
                        value={amount} 
                        className="w-full min-w-0 flex-1 bg-transparent border-none px-2 py-1 text-4xl font-semibold text-right text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-200" 
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
                <div className="pt-2 flex flex-col gap-2">
                   <div className="flex justify-center items-center gap-1.5 opacity-60">
                     <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Powered by</span>
                     <span className="text-[12px] font-black tracking-wider text-[#3b82f6]">LI.FI</span>
                     <span className="text-[11px] font-semibold text-slate-400 mx-1">|</span>
                     <span className="text-[11px] font-bold text-green-500">0% SLIPPAGE</span>
                   </div>
                   <button
                     onClick={executeBridge}
                     disabled={!walletConnected || !amount || parseFloat(amount) <= 0}
                     className={`w-full py-4 rounded-[20px] font-bold text-[16px] transition-all flex items-center justify-center gap-2 ${
                       !walletConnected || !amount || parseFloat(amount) <= 0
                         ? 'bg-slate-100 dark:bg-[#1f1f2e] text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-[#1f1f2e]'
                         : 'bg-blue-600 text-white dark:text-[#0c0c10] shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0'
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
                className="bg-white dark:bg-[#13131a] rounded-[24px] p-6 border border-slate-100 dark:border-[#1f1f2e] shadow-[0_2px_20px_rgba(0,0,0,0.04)]"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                     {step === 'SUCCESS' ? (
                       <CheckCircle2 className="w-8 h-8 text-green-500" />
                     ) : (
                       <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                     )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    {step === 'SUCCESS' ? 'Bridge Complete!' : 'Bridging in Progress'}
                  </h3>
                  <p className="text-slate-500 dark:text-[#8a8a9e] text-sm font-medium mt-1">
                    {amount} USDC from {fromNet} to {toNet}
                  </p>
                </div>

                <div className="space-y-1">
                  {renderStep('Approve USDC', step === 'APPROVING', ['BURNING', 'ATTESTING', 'MINTING', 'SUCCESS'].includes(step))}
                  {renderStep('Initiate on source chain', step === 'BURNING', ['ATTESTING', 'MINTING', 'SUCCESS'].includes(step))}
                  {renderStep('LI.FI cross-chain swap', step === 'ATTESTING', ['MINTING', 'SUCCESS'].includes(step))}
                  {renderStep('Complete on destination', step === 'MINTING', step === 'SUCCESS')}
                </div>

                {step === 'SUCCESS' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                    {completedSteps && (
                      <div className="flex flex-col gap-2 pt-4 border-t border-slate-100 dark:border-[#1f1f2e]">
                        {completedSteps.filter(s => s.name === 'burn' && s.txHash).map((s, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 dark:text-[#8a8a9e] font-medium capitalize">Transaction Hash</span>
                            <a 
                              href={s.explorerUrl || `https://arcscan.io/tx/${s.txHash}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-blue-500 hover:underline flex items-center gap-1 font-semibold"
                            >
                              {s.txHash.substring(0, 6)}...{s.txHash.substring(s.txHash.length - 4)}
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={resetState}
                      className="w-full mt-6 py-3.5 rounded-[16px] font-bold text-[15px] bg-slate-100 dark:bg-[#1f1f2e] text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors"
                    >
                      Done
                    </motion.button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
