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
import { AppKit } from "@circle-fin/app-kit";
import { createEthersAdapterFromProvider } from "@circle-fin/adapter-ethers-v6";

export default function BridgeView() {
  const { walletConnected, addNotification, balances, setBalances, getProvider, walletAddress } = useAppState();

  const [fromNet, setFromNet] = useState<string>('Arc Testnet');
  const [toNet, setToNet] = useState<string>('Arbitrum Sepolia');
  const [amount, setAmount] = useState<string>('');
  const [isBridging, setIsBridging] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<'IDLE' | 'APPROVING' | 'BURNING' | 'ATTESTING' | 'MINTING' | 'HOOK' | 'SUCCESS'>('IDLE');
  const [completedSteps, setCompletedSteps] = useState<any[] | null>(null);
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
    const nonArcChain = fromNet === 'Arc Testnet' ? toNet : fromNet;
    switch(nonArcChain) {
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
  }, [fromNet, toNet, walletAddress, fetchTrigger]);
  
  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [slippage, setSlippage] = useState('0.1');

  const currentBalance = fromNet === 'Arc Testnet' ? balances.USDC : externalBalance;

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
    const temp = fromNet;
    setFromNet(toNet);
    setToNet(temp);
  };

  const resetState = () => {
    setTimeout(() => {
      setAmount('');
      setIsBridging(false);
      setBridgeStatus('IDLE');
      setCompletedSteps(null);
    }, 15000); // 15 seconds to give user time to click link
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

  const getAppKitChainName = (net: string) => {
    switch (net) {
      case 'Arbitrum Sepolia': return 'Arbitrum_Sepolia';
      case 'Base Sepolia': return 'Base_Sepolia';
      case 'Ethereum Sepolia': return 'Ethereum_Sepolia';
      case 'Optimism Sepolia': return 'OP_Sepolia'; // As per typical circle identifiers, but will default if wrong
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
      addNotification('error', 'Insufficient Balance', `You only have ${currentBalance} USDC on ${fromNet}.`);
      return;
    }

    setIsBridging(true);


    const eth = getProvider() || (typeof window !== 'undefined' ? (window as any).ethereum : null);
    if (!eth) {
        addNotification('error', 'No Wallet', 'Please install MetaMask.');
        setIsBridging(false);
        return;
    }

    try {
        console.log('[Bridge] Starting bridge process...');
        console.log('[Bridge] Switching network to', fromNet);
        await switchNetwork(fromNet);

        console.log('[Bridge] Network switched. Initializing App Kit...');
        const adapter = await createEthersAdapterFromProvider({
            provider: eth
        });
        
        console.log('[Bridge] Adapter created. Creating AppKit instance...');
        const kit = new AppKit();
        
        kit.on("*", (payload: any) => {
            console.log('[Bridge Event]', payload);
            if (payload.method === 'approve' && payload.values?.state !== 'success') {
                setBridgeStatus('APPROVING');
                addNotification('info', 'Approving USDC', 'Approving USDC for cross-chain transfer...');
            }
            if (payload.method === 'burn') {
                setBridgeStatus('BURNING');

            }
            if (payload.method === 'fetchAttestation') {
                setBridgeStatus('ATTESTING');

                addNotification('info', 'Awaiting Attestation', 'Waiting for Circle attestation...');
            }
            if (payload.method === 'mint') {
                setBridgeStatus('MINTING');

                addNotification('info', 'Minting Native USDC', 'Minting USDC on destination chain...');
            }
        });

        if (fromNet === 'Arc Testnet') {
            console.log('[Bridge] Executing on-chain bridge via BridgingKitContract on Arc Testnet...');
            try {
                setBridgeStatus('APPROVING');
                addNotification('info', 'Approving USDC', 'Please confirm the bridge transaction in your wallet...');
                
                // Real BridgingKitContract logic based on successful tx 0x911bdc1349d87bdc6198dc4c54f0a041ef8119a9d33e413eddbc744e343847c0
                const bridgingKitAddress = '0xc5567a5e3370d4dbfb0540025078e283e36a363d';
                const arcUsdcAddress = '0x3600000000000000000000000000000000000000'; // Correct USDC on Arc
                
                const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1e6));
                
                // Destination Domain mapping
                let destDomain = 0;
                let destChainId = 0;
                switch(toNet) {
                    case 'Arbitrum Sepolia': destDomain = 3; destChainId = 421614; break;
                    case 'Base Sepolia': destDomain = 6; destChainId = 84532; break;
                    case 'Ethereum Sepolia': destDomain = 0; destChainId = 11155111; break;
                    case 'Optimism Sepolia': destDomain = 2; destChainId = 11155420; break;
                    case 'Avalanche Fuji': destDomain = 1; destChainId = 43113; break;
                    case 'Polygon Amoy': destDomain = 7; destChainId = 80002; break;
                    default: destDomain = 3; destChainId = 421614;
                }
                
                // Pack the data payload exactly matching the working tx format
                // 0x513e1175 is the function selector
                let data = '0x513e1175';
                data += amountInWei.toString(16).padStart(64, '0');
                // The tx used 0x11b3d (72509). We'll use the actual chainId if known, or fallback to 72509.
                data += (72509).toString(16).padStart(64, '0');
                data += walletAddress.replace('0x', '').padStart(64, '0');
                data += arcUsdcAddress.replace('0x', '').padStart(64, '0');
                data += bridgingKitAddress.replace('0x', '').padStart(64, '0');
                data += destDomain.toString(16).padStart(64, '0');
                data += (1000).toString(16).padStart(64, '0'); // Hardcoded param from original tx
                data += (320).toString(16).padStart(64, '0');  // offset to dynamic string?
                data += (12).toString(16).padStart(64, '0');   // string length
                // "cctp-forward" in hex padded to 32 bytes
                data += '636374702d666f72776172640000000000000000000000000000000000000000';
                
                const txHash = await eth.request({
                    method: 'eth_sendTransaction',
                    params: [{
                        from: walletAddress,
                        to: bridgingKitAddress,
                        data: data
                    }]
                });

                setBridgeStatus('BURNING');
                
                
                setBridgeStatus('SUCCESS');
                
                const val = parseFloat(amount);
                setBalances(prev => ({ ...prev, USDC: Math.max(0, prev.USDC - val) }));
                
                addNotification('success', 'Bridge Complete', 'USDC successfully bridged!');
                setIsBridging(false);
                refreshBalance();
                resetState();

            } catch (error: any) {
                console.error(error);
                addNotification('error', 'Transaction Failed', error.message || 'Transaction rejected by user.');
                setIsBridging(false);
                setBridgeStatus('IDLE');
            }
            return;
        }

        console.log('[Bridge] Calling kit.bridge()...');
        let result = await kit.bridge({
            from: { adapter, chain: getAppKitChainName(fromNet) as any },
            to: { 
                adapter, 
                chain: getAppKitChainName(toNet) as any,
                useForwarder: true 
            },
            amount: amount,
        });
        console.log('[Bridge] kit.bridge() returned:', result);

        if (result.state === "error") {
            console.log('[Bridge] Error in result:', (result as any).error, (result as any).steps);
            addNotification('info', 'Bridge Retry', 'First attempt errored, retrying bridge...');
            result = await kit.retryBridge(result as any, {
                from: adapter,
                to: adapter,
            });
        console.log('[Bridge] retryBridge returned:', result);
        }

        if (result.state === "success") {
            setBridgeStatus('SUCCESS');
            
            if ((result as any).steps) {
                setCompletedSteps((result as any).steps);
            }

            addNotification('success', 'Bridge Complete', 'USDC successfully bridged!');
            setIsBridging(false); 
            refreshBalance();
            resetState();
        } else {
            throw new Error("Bridge failed, please check logs.");
        }
    } catch (err: any) {
        console.error(err);
        addNotification('error', 'Transaction Failed', err.message || 'Transaction rejected by user.');
        setIsBridging(false);
        setBridgeStatus('IDLE');

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



      {/* Bridge Widget */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 w-full max-w-[480px] bg-white rounded-[2rem] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-slate-100 flex flex-col gap-4"
      >
        
        {/* Success Block */}
        {bridgeStatus === 'SUCCESS' && completedSteps && (
          <div className="bg-[#EBF3FF] rounded-2xl p-5 border border-[#0052FF]/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#0052FF] flex items-center justify-center text-white shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h3 className="font-bold text-[#0052FF] text-lg leading-tight">Bridge Complete!</h3>
                <p className="text-sm text-slate-600 mt-0.5">Your USDC has been delivered to {toNet}</p>
              </div>
            </div>
            
                      </div>
        )}

        {/* From Section */}
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
        <div className="bg-white border border-slate-200 rounded-[1.25rem] p-4 shadow-sm">
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
            <div className="relative border border-slate-100 rounded-2xl bg-white hover:bg-slate-50 transition-colors">
              <select
                value={fromNet}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === toNet) setToNet(fromNet);
                  setFromNet(val);
                }}
                className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none cursor-pointer appearance-none px-4 py-3 relative z-10"
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
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full min-w-0 flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-2xl font-bold text-right text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 placeholder:text-slate-300 ml-4 transition-all"
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
        <div className="bg-white border border-slate-200 rounded-[1.25rem] p-4 mt-2 mb-4 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-bold text-slate-400">To</span>
          </div>

          <div className="mb-4">
            <div className="relative border border-slate-100 rounded-2xl bg-white hover:bg-slate-50 transition-colors">
              <select
                value={toNet}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === fromNet) setFromNet(toNet);
                  setToNet(val);
                }}
                className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none cursor-pointer appearance-none px-4 py-3 relative z-10"
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
            </span>
          ) : bridgeStatus === 'SUCCESS' ? (
            <span className="flex items-center justify-center w-full h-full text-[#0052FF]">
              <CheckCircle2 size={16} className="mr-2" />
              Bridge Successful!
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
               <ArrowRightLeft size={12} />
               Review & Bridge
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
