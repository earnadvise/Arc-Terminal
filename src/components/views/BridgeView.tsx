import React, { useState, useEffect, useRef } from 'react';
import { useAppState } from '@/context/useAppState';
import { RefreshCw, ChevronDown, ArrowDownUp, CheckCircle2, Circle, Loader2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from "ethers";

type BridgeStep = 'IDLE' | 'APPROVING' | 'BURNING' | 'ATTESTING' | 'MINTING' | 'SUCCESS' | 'ERROR';

export default function BridgeView() {
  const { walletConnected, walletAddress, setBalances, balances, addNotification, getProvider } = useAppState();

  const [fromNet, setFromNet] = useState('Arbitrum');
  const [toNet, setToNet] = useState('Arc Mainnet');
  const [amount, setAmount] = useState('');
  
  const [isBridging, setIsBridging] = useState(false);
  const [step, setStep] = useState<BridgeStep>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentBalance, setCurrentBalance] = useState(0);

  // Cross-chain tracking states
  const [sourceTxHash, setSourceTxHash] = useState('');
  const [sourceExplorerUrl, setSourceExplorerUrl] = useState('');
  const [destTxHash, setDestTxHash] = useState('');
  const [destExplorerUrl, setDestExplorerUrl] = useState('');
  const [crossChainStatus, setCrossChainStatus] = useState('');
  const [bridgeTrackerUrl, setBridgeTrackerUrl] = useState('');

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Official USDC contract addresses for mainnets
  const USDC_ADDRESSES: Record<string, string> = {
    'Arbitrum': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    'Base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    'Ethereum': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    'Optimism': '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    'Avalanche': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    'Polygon': '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    'Arc Mainnet': '0x3600000000000000000000000000000000000000',
  };

  const getExplorerBase = (net: string) => {
    switch (net) {
      case 'Ethereum': return 'https://etherscan.io/tx/';
      case 'Arbitrum': return 'https://arbiscan.io/tx/';
      case 'Optimism': return 'https://optimistic.etherscan.io/tx/';
      case 'Base': return 'https://basescan.org/tx/';
      case 'Polygon': return 'https://polygonscan.com/tx/';
      case 'Avalanche': return 'https://snowtrace.io/tx/';
      default: return 'https://explorer.arc.io/tx/';
    }
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

  // Clean up polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleMax = () => {
    setAmount((currentBalance || 0).toString());
  };

  const reverseDirection = () => {
    setFromNet(toNet);
    setToNet(fromNet);
  };

  const resetState = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setAmount('');
    setStep('IDLE');
    setErrorMessage('');
    setIsBridging(false);
    setSourceTxHash('');
    setDestTxHash('');
    setCrossChainStatus('');
    setBridgeTrackerUrl('');
  };

  const switchNetwork = async (networkName: string) => {
    const eth = getProvider() || (typeof window !== 'undefined' ? (window as any).ethereum : null);
    if (!eth) return;
    let chainId = '0x13b2'; // Arc Mainnet (5042)
    switch(networkName) {
      case 'Arbitrum': chainId = '0xa4b1'; break;
      case 'Base': chainId = '0x2105'; break;
      case 'Ethereum': chainId = '0x1'; break;
      case 'Optimism': chainId = '0xa'; break;
      case 'Avalanche': chainId = '0xa86a'; break;
      case 'Polygon': chainId = '0x89'; break;
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

  // Poll LI.FI & Polymer status until funds actually arrive on destination chain
  const pollBridgeStatus = async (txHash: string, targetNet: string, targetAddress: string) => {
    setStep('ATTESTING');
    setCrossChainStatus('Waiting for source chain block finality (~15 mins for CCTP)...');
    const defaultTracker = `https://lifi-explorer.polymer.zone/transfer/mainnet/${txHash}`;
    setBridgeTrackerUrl(defaultTracker);

    const check = async (): Promise<boolean> => {
      try {
        const res = await fetch(`https://li.quest/v1/status?txHash=${txHash}`);
        if (!res.ok) return false;
        const data = await res.json();

        if (data.bridgeExplorerLink) {
          setBridgeTrackerUrl(data.bridgeExplorerLink);
        }

        if (data.status === 'DONE') {
          const destHash = data.receiving?.txHash;
          if (destHash) {
            setDestTxHash(destHash);
            setDestExplorerUrl(`${getExplorerBase(targetNet)}${destHash}`);
          }
          setStep('SUCCESS');
          setCrossChainStatus('Funds successfully minted and arrived!');

          // Refresh Arc balance directly from RPC if destination is Arc
          if (targetNet === 'Arc Mainnet') {
            try {
              const arcRpc = 'https://rpc.mainnet.arc.io';
              const usdcAddr = '0x3600000000000000000000000000000000000000';
              const callData = '0x70a08231000000000000000000000000' + targetAddress.replace(/^0x/, '');
              const bRes = await fetch(arcRpc, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: usdcAddr, data: callData }, 'latest'] })
              });
              const bData = await bRes.json();
              if (bData.result) {
                const newBal = parseInt(bData.result, 16) / 1e6;
                setBalances(prev => ({ ...prev, USDC: newBal }));
              }
            } catch (rpcErr) {
              console.error('Failed refreshing Arc balance', rpcErr);
            }
          }

          addNotification('success', 'Bridge Complete', `USDC has officially arrived on ${targetNet}!`);
          return true; // Stop polling
        }

        if (data.status === 'FAILED') {
          setStep('ERROR');
          setErrorMessage(data.substatusMessage || 'Bridge transfer failed on relayer.');
          addNotification('error', 'Bridge Failed', data.substatusMessage || 'Transfer failed.');
          return true; // Stop polling
        }

        // Still pending
        if (data.substatus === 'WAIT_SOURCE_CONFIRMATIONS') {
          setStep('ATTESTING');
          setCrossChainStatus('Waiting for source chain finality (Circle CCTP ~15–18 mins)...');
        } else {
          setStep('MINTING');
          setCrossChainStatus(data.substatusMessage || 'Relayer executing mint on destination chain...');
        }

        return false;
      } catch (err) {
        console.error('Status check error:', err);
        return false;
      }
    };

    // Immediate first check
    const done = await check();
    if (done) return;

    // Poll every 8 seconds
    pollIntervalRef.current = setInterval(async () => {
      const isFinished = await check();
      if (isFinished && pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }, 8000);
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
    setSourceTxHash('');
    setDestTxHash('');
    setCrossChainStatus('');

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

        const srcUrl = `${getExplorerBase(fromNet)}${tx.hash}`;
        setSourceTxHash(tx.hash);
        setSourceExplorerUrl(srcUrl);

        console.log('[LI.FI] Waiting for source transaction confirmation...', tx.hash);
        await tx.wait();
        
        addNotification('info', 'Source Tx Confirmed', `Confirmed on ${fromNet}. Cross-chain bridge in progress...`);

        // Begin live polling for cross-chain settlement (Polymer / Circle CCTP)
        await pollBridgeStatus(tx.hash, toNet, address);

    } catch (err: any) {
        console.error(err);
        setStep('ERROR');
        setErrorMessage(err.message || 'Transaction rejected by user.');
        addNotification('error', 'Bridge Failed', err.message || 'Transaction rejected by user.');
        setIsBridging(false);
    }
  };

  const renderStep = (title: string, isActive: boolean, isDone: boolean) => (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors ${isActive ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''}`}>
      {isDone ? (
        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
      ) : isActive ? (
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
      ) : (
        <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0" />
      )}
      <span className={`text-sm font-semibold ${isActive ? 'text-blue-600 dark:text-blue-400' : isDone ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
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
          className="w-full max-w-[440px] bg-white dark:bg-[#13131a]/70 backdrop-blur-xl rounded-[32px] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-white dark:border-[#1f1f2e]"
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
                        <option value="Arbitrum">Arbitrum</option>
                        <option value="Base">Base</option>
                        <option value="Ethereum">Ethereum</option>
                        <option value="Optimism">Optimism</option>
                        <option value="Avalanche">Avalanche</option>
                        <option value="Polygon">Polygon</option>
                        <option value="Arc Mainnet">Arc Mainnet</option>
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
                  <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm font-medium p-3 rounded-xl border border-red-100 dark:border-red-900/40">
                    {errorMessage}
                  </div>
                )}

                {/* ACTION BUTTON */}
                <div className="pt-2 flex flex-col gap-2">
                   <div className="flex justify-center items-center gap-1.5 opacity-60">
                     <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Powered by</span>
                     <span className="text-[12px] font-black tracking-wider text-[#3b82f6]">LI.FI + Polymer</span>
                     <span className="text-[11px] font-semibold text-slate-400 mx-1">|</span>
                     <span className="text-[11px] font-bold text-green-500">Circle CCTP</span>
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
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 rounded-full flex items-center justify-center mx-auto mb-3">
                     {step === 'SUCCESS' ? (
                       <CheckCircle2 className="w-8 h-8 text-green-500" />
                     ) : (
                       <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                     )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    {step === 'SUCCESS' ? 'Bridge Complete!' : 'Cross-Chain Bridge in Progress'}
                  </h3>
                  <p className="text-slate-500 dark:text-[#8a8a9e] text-sm font-medium mt-1">
                    {amount} USDC from {fromNet} to {toNet}
                  </p>
                </div>

                <div className="space-y-1">
                  {renderStep('1. Approve USDC', step === 'APPROVING', ['BURNING', 'ATTESTING', 'MINTING', 'SUCCESS'].includes(step))}
                  {renderStep(`2. Submit on ${fromNet}`, step === 'BURNING', ['ATTESTING', 'MINTING', 'SUCCESS'].includes(step))}
                  {renderStep('3. Cross-chain finality & validation', step === 'ATTESTING', ['MINTING', 'SUCCESS'].includes(step))}
                  {renderStep(`4. Mint & arrive on ${toNet}`, step === 'MINTING', step === 'SUCCESS')}
                </div>

                {/* In-Flight Live Information Card */}
                {(step === 'ATTESTING' || step === 'MINTING') && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40 text-xs flex flex-col gap-2">
                    <div className="flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-300">
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span>{crossChainStatus || 'Processing cross-chain transfer...'}</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                      Source transaction confirmed! Cross-chain CCTP finality takes ~15–18 minutes. You can safely close or browse—your funds are safe and will automatically arrive.
                    </p>

                    {sourceTxHash && (
                      <div className="flex justify-between items-center text-[11px] pt-2 border-t border-blue-100/60 dark:border-blue-900/40">
                        <span className="text-slate-500 dark:text-slate-400">Source ({fromNet}):</span>
                        <a 
                          href={sourceExplorerUrl || `https://arbiscan.io/tx/${sourceTxHash}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-blue-600 dark:text-blue-400 font-mono font-medium underline flex items-center gap-1"
                        >
                          {sourceTxHash.slice(0, 6)}...{sourceTxHash.slice(-4)}
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    )}

                    {bridgeTrackerUrl && (
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">Live Bridge Tracker:</span>
                        <a 
                          href={bridgeTrackerUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-blue-600 dark:text-blue-400 font-semibold underline flex items-center gap-1"
                        >
                          View Polymer Explorer
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Success Card with Explorer Links */}
                {step === 'SUCCESS' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5">
                    <div className="flex flex-col gap-2 p-3.5 bg-green-50/70 dark:bg-green-950/30 rounded-xl border border-green-100 dark:border-green-900/40 text-xs">
                      <span className="font-bold text-green-700 dark:text-green-300">
                        {amount} USDC successfully arrived on {toNet}!
                      </span>
                      {sourceTxHash && (
                        <div className="flex justify-between items-center text-[11px] pt-1">
                          <span className="text-slate-500 dark:text-slate-400">Source Tx ({fromNet}):</span>
                          <a 
                            href={sourceExplorerUrl || `${getExplorerBase(fromNet)}${sourceTxHash}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-blue-600 dark:text-blue-400 font-mono underline flex items-center gap-1"
                          >
                            {sourceTxHash.slice(0, 6)}...{sourceTxHash.slice(-4)}
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      )}
                      {destTxHash && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400">Destination Tx ({toNet}):</span>
                          <a 
                            href={destExplorerUrl || `${getExplorerBase(toNet)}${destTxHash}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-green-600 dark:text-green-400 font-mono font-semibold underline flex items-center gap-1"
                          >
                            {destTxHash.slice(0, 6)}...{destTxHash.slice(-4)}
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      )}
                    </div>

                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={resetState}
                      className="w-full mt-5 py-3.5 rounded-[16px] font-bold text-[15px] bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
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
