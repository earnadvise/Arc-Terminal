import React, { useState, useEffect } from 'react';
import { useAppState } from '@/context/useAppState';
import { RefreshCw, ChevronDown, ArrowDownUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppKit } from "@circle-fin/app-kit";
import { createEthersAdapterFromProvider } from "@circle-fin/adapter-ethers-v6";

export default function BridgeView() {
  const { walletConnected, walletAddress, setBalances, balances, addNotification, getProvider } = useAppState();

  const [fromNet, setFromNet] = useState('Arc Testnet');
  const [toNet, setToNet] = useState('Arbitrum Sepolia');
  const [amount, setAmount] = useState('');
  
  const [isBridging, setIsBridging] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<'IDLE' | 'APPROVING' | 'BURNING' | 'ATTESTING' | 'MINTING' | 'SUCCESS'>('IDLE');
  const [completedSteps, setCompletedSteps] = useState<any[] | null>(null);

  const currentBalance = balances.USDC || 0;

  const handleMax = () => {
    setAmount((balances.USDC || 0).toString());
  };

  const reverseDirection = () => {
    setFromNet(toNet);
    setToNet(fromNet);
  };

  const resetState = () => {
    setAmount('');
  };

  const switchNetwork = async (networkName: string) => {
    const eth = getProvider() || (typeof window !== 'undefined' ? (window as any).ethereum : null);
    if (!eth) return;
    let chainId = '0x11b5e'; // Arc Testnet (72542)
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
      addNotification('error', 'Insufficient Balance', \`You only have \${currentBalance} USDC on \${fromNet}.\`);
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

        if (fromNet === 'Arc Testnet') {
            console.log('[Bridge] Executing on-chain bridge via BridgingKitContract on Arc Testnet...');
            setBridgeStatus('APPROVING');
            addNotification('info', 'Approving USDC', 'Please confirm the bridge transaction in your wallet...');
            
            const bridgingKitAddress = '0xc5567a5e3370d4dbfb0540025078e283e36a363d';
            const arcUsdcAddress = '0x3600000000000000000000000000000000000000'; 
            
            const amountInWei = BigInt(Math.floor(val * 1e6));
            
            let destDomain = 0;
            switch(toNet) {
                case 'Arbitrum Sepolia': destDomain = 3; break;
                case 'Base Sepolia': destDomain = 6; break;
                case 'Ethereum Sepolia': destDomain = 0; break;
                case 'Optimism Sepolia': destDomain = 2; break;
                case 'Avalanche Fuji': destDomain = 1; break;
                case 'Polygon Amoy': destDomain = 7; break;
                default: destDomain = 3;
            }
            
            let data = '0x513e1175';
            data += amountInWei.toString(16).padStart(64, '0');
            data += (72509).toString(16).padStart(64, '0');
            data += walletAddress.replace('0x', '').padStart(64, '0');
            data += arcUsdcAddress.replace('0x', '').padStart(64, '0');
            data += bridgingKitAddress.replace('0x', '').padStart(64, '0');
            data += destDomain.toString(16).padStart(64, '0');
            data += (1000).toString(16).padStart(64, '0'); 
            data += (320).toString(16).padStart(64, '0');  
            data += (12).toString(16).padStart(64, '0');   
            data += '636374702d666f72776172640000000000000000000000000000000000000000';
            
            const txHash = await eth.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: walletAddress,
                    to: bridgingKitAddress,
                    data: data
                }]
            });

            setBridgeStatus('SUCCESS');
            setBalances(prev => ({ ...prev, USDC: Math.max(0, prev.USDC - val) }));
            addNotification('success', 'Bridge Complete', 'USDC successfully bridged!');
            setIsBridging(false);
            resetState();
            return;
        }

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
        });

        const fromChain = getAppKitChainName(fromNet);
        const toChain = getAppKitChainName(toNet);

        let result = await kit.bridge({
            from: { adapter, chain: fromChain as any },
            to: { 
                adapter, 
                chain: toChain as any,
                useForwarder: true 
            },
            amount: amount,
        });

        if (result.state === "error") {
            result = await kit.retryBridge(result as any, {
                from: adapter,
                to: adapter,
            });
        }

        if (result.state === "success") {
            setBridgeStatus('SUCCESS');
            setBalances(prev => ({ ...prev, USDC: Math.max(0, prev.USDC - val) }));
            addNotification('success', 'Bridge Complete', 'USDC successfully bridged!');
            setIsBridging(false);
            resetState();
        } else {
            throw new Error("Bridge failed on source chain.");
        }

    } catch (err: any) {
        console.error(err);
        addNotification('error', 'Transaction Failed', err.message || 'Transaction rejected by user.');
        setIsBridging(false);
        setBridgeStatus('IDLE');
    }
  };

  return (
    <div className="flex-1 w-full relative flex items-center justify-center p-4">
      {/* Background - Soft Purple/White Waves */}
      <div className="absolute inset-0 bg-[#f7f5ff] -z-10 overflow-hidden">
        <div className="absolute top-[0%] left-[10%] w-[60%] h-[60%] bg-[#e3dcff] blur-[100px] rounded-full opacity-60 mix-blend-multiply" />
        <div className="absolute bottom-[0%] right-[10%] w-[50%] h-[50%] bg-[#f0ebff] blur-[100px] rounded-full opacity-80 mix-blend-multiply" />
        <div className="absolute top-[20%] right-[30%] w-[40%] h-[40%] bg-white blur-[80px] rounded-full opacity-90" />
      </div>

      <div className="w-full max-w-[900px] flex gap-12 items-start justify-center">
        {/* Bridge Widget */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[420px] bg-white/60 backdrop-blur-xl rounded-[24px] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-white"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-[13px] font-semibold text-slate-400">Cross-chain transfers</h2>
          </div>

          {/* FROM CARD */}
          <div className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-sm relative z-10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-500">From</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-slate-400">
                  Balance: {(currentBalance || 0).toFixed(4)}
                </span>
                <button 
                  onClick={handleMax}
                  className="text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="relative border border-slate-100 rounded-[12px] bg-slate-50 hover:bg-slate-100 transition-colors">
                <select
                  value={fromNet}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === toNet) setToNet(fromNet);
                    setFromNet(val);
                  }}
                  className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none cursor-pointer appearance-none px-4 py-2.5 relative z-10"
                >
                  <option value="Arc Testnet">Arc Testnet</option>
                  <option value="Arbitrum Sepolia">Arbitrum Sepolia</option>
                  <option value="Base Sepolia">Base Sepolia</option>
                  <option value="Ethereum Sepolia">Ethereum Sepolia</option>
                  <option value="Optimism Sepolia">Optimism Sepolia</option>
                  <option value="Avalanche Fuji">Avalanche Fuji</option>
                  <option value="Polygon Amoy">Polygon Amoy</option>
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-0" />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-full px-3 py-1.5 shrink-0">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-500 text-[10px] font-bold">$</span>
                  </div>
                  <span className="font-bold text-slate-700 text-sm">USDC</span>
                </div>
                <input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full min-w-0 flex-1 bg-transparent border-none px-2 py-1 text-3xl font-semibold text-right text-slate-800 outline-none placeholder:text-slate-300 ml-2"
                />
              </div>
            </div>
          </div>

          {/* REVERSE ARROW */}
          <div className="flex justify-center -my-3 relative z-20">
            <button
              onClick={reverseDirection}
              className="w-8 h-8 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all active:scale-95"
            >
              <ArrowDownUp size={14} />
            </button>
          </div>

          {/* TO CARD */}
          <div className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-sm relative z-10 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-500">To</span>
            </div>

            <div className="flex flex-col gap-3">
              <div className="relative border border-slate-100 rounded-[12px] bg-slate-50 hover:bg-slate-100 transition-colors">
                <select
                  value={toNet}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === fromNet) setFromNet(toNet);
                    setToNet(val);
                  }}
                  className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none cursor-pointer appearance-none px-4 py-2.5 relative z-10"
                >
                  <option value="Arc Testnet">Arc Testnet</option>
                  <option value="Arbitrum Sepolia">Arbitrum Sepolia</option>
                  <option value="Base Sepolia">Base Sepolia</option>
                  <option value="Ethereum Sepolia">Ethereum Sepolia</option>
                  <option value="Optimism Sepolia">Optimism Sepolia</option>
                  <option value="Avalanche Fuji">Avalanche Fuji</option>
                  <option value="Polygon Amoy">Polygon Amoy</option>
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-0" />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-full px-3 py-1.5 shrink-0">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-500 text-[10px] font-bold">$</span>
                  </div>
                  <span className="font-bold text-slate-700 text-sm">USDC</span>
                </div>
                <input type="text" readOnly placeholder="0" value={amount} className="w-full min-w-0 flex-1 bg-transparent border-none px-2 py-1 text-3xl font-semibold text-right text-slate-800 outline-none placeholder:text-slate-300 ml-2" />
              </div>
            </div>
          </div>

          {/* ACTION BUTTON */}
          <div className="bg-white rounded-[20px] p-1.5 border border-slate-100 flex flex-col items-center gap-2 shadow-sm">
             <button
               onClick={executeBridge}
               disabled={isBridging || !walletConnected || !amount || parseFloat(amount) <= 0}
               className={\`w-full py-3.5 rounded-[16px] font-bold text-sm transition-colors flex items-center justify-center gap-2 \${
                 isBridging || !walletConnected || !amount || parseFloat(amount) <= 0
                   ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                   : 'bg-[#0052FF] text-white shadow-md hover:bg-blue-600'
               }\`}
             >
               {isBridging ? (
                 <span className="flex items-center gap-2">
                   <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                   Bridging...
                 </span>
               ) : !walletConnected ? (
                 'Connect Wallet'
               ) : (
                 <>
                   <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                     <span className="text-white text-xs">→</span>
                   </div>
                   Approve & Bridge
                 </>
               )}
             </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
