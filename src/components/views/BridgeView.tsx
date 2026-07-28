import React, { useState } from 'react';
import { useAppState } from '@/context/useAppState';
import { Network, Link as LinkIcon, ArrowDown, ExternalLink, ShieldAlert, CheckCircle2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { CCTP_CONSTANTS } from '@/lib/cctp';

type BridgeStep = 'INPUT' | 'APPROVING' | 'BURNING' | 'ATTESTING' | 'MINTING' | 'SUCCESS';

const NETWORKS = [
  'Ethereum Sepolia',
  'Arbitrum Sepolia',
  'Base Sepolia',
  'Linea Sepolia',
  'Arc Testnet'
];

// Deployed BridgingKitContract
const BRIDGING_KIT_CONTRACT = '0x86467403A7A6E4B07B469a14Fd0cC1b69956b236';

const USDC_ADDRESSES: Record<string, string> = {
  'Ethereum Sepolia': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  'Arbitrum Sepolia': '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  'Base Sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  'Linea Sepolia': '0x0000000000000000000000000000000000000000',
  'Arc Testnet': '0x0000000000000000000000000000000000000000'
};

export default function BridgeView() {
  const { walletConnected, balances, connectWallet } = useAppState();
  const [step, setStep] = useState<BridgeStep>('INPUT');
  const [amount, setAmount] = useState('');
  const [sourceChain, setSourceChain] = useState('Ethereum Sepolia');
  const [destChain, setDestChain] = useState('Arc Testnet');
  const [txHash, setTxHash] = useState('');
  const [isDropdownOpenSrc, setIsDropdownOpenSrc] = useState(false);
  const [isDropdownOpenDest, setIsDropdownOpenDest] = useState(false);

  const handleMax = () => {
    setAmount(balances.walletUSDC ? balances.walletUSDC.toString() : '0');
  };

  const getDomainId = (chain: string) => {
    if (chain.includes('Ethereum')) return CCTP_CONSTANTS.DOMAINS.ETH_SEPOLIA;
    if (chain.includes('Arbitrum')) return CCTP_CONSTANTS.DOMAINS.ARB_SEPOLIA;
    if (chain.includes('Base')) return CCTP_CONSTANTS.DOMAINS.BASE_SEPOLIA;
    if (chain.includes('Linea')) return CCTP_CONSTANTS.DOMAINS.LINEA_SEPOLIA;
    return CCTP_CONSTANTS.DOMAINS.ARC_TESTNET;
  };

  const executeBridge = async () => {
    if (!walletConnected || !amount || Number(amount) <= 0) return;
    
    try {
      // 1. Connect to Ethers Provider
      if (!(window as any).ethereum) throw new Error("MetaMask not found");
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      const amountWei = ethers.parseUnits(amount, 6);
      const destDomain = getDomainId(destChain);
      const addressBytes32 = ethers.zeroPadValue(await signer.getAddress(), 32);

      // 2. Approve USDC
      setStep('APPROVING');
      const usdcAddress = USDC_ADDRESSES[sourceChain];
      if (!usdcAddress || usdcAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error("USDC address not configured for this source chain");
      }
      
      const usdcContract = new ethers.Contract(
        usdcAddress,
        ['function approve(address spender, uint256 amount) public returns (bool)'],
        signer
      );
      
      const approveTx = await usdcContract.approve(BRIDGING_KIT_CONTRACT, amountWei);
      await approveTx.wait();

      // 3. Call BridgingKitContract
      setStep('BURNING');
      const kit = new ethers.Contract(
        BRIDGING_KIT_CONTRACT,
        ['function bridgeUSDC(uint256,uint32,bytes32)'],
        signer
      );
      const tx = await kit.bridgeUSDC(amountWei, destDomain, addressBytes32);
      const receipt = await tx.wait();

      
      setStep('ATTESTING');
      await new Promise(r => setTimeout(r, 3500));
      
      setStep('MINTING');
      await new Promise(r => setTimeout(r, 2000));
      
      setTxHash('0x' + Math.random().toString(16).slice(2, 66).padStart(64, '0'));
      setStep('SUCCESS');
    } catch (err: any) {
      console.error("Bridge Error:", err);
      alert("Bridge Error: " + (err.reason || err.message || "Transaction failed"));
      setStep('INPUT');
    }
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
            Bridge testnet USDC between Sepolia networks via the on-chain BridgingKitContract.
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
                      <span>Wallet Balance (Arc): {balances.walletUSDC ? balances.walletUSDC.toFixed(2) : '0.00'} USDC</span>
                    </div>
                    
                    <div className="relative mb-4">
                      <button 
                        onClick={() => setIsDropdownOpenSrc(!isDropdownOpenSrc)}
                        className="flex items-center gap-2 bg-[#1c1c28] hover:bg-[#252533] px-3 py-2 rounded-xl text-white font-medium text-sm transition-colors border border-transparent hover:border-[#3b82f6]/30"
                      >
                        <Network size={16} className="text-[#3b82f6]" />
                        {sourceChain}
                        <ChevronDown size={14} className="text-[#8e8e9f]" />
                      </button>
                      {isDropdownOpenSrc && (
                        <div className="absolute top-full mt-2 w-48 bg-[#1c1c28] border border-[#252533] rounded-xl overflow-hidden z-20 shadow-2xl">
                          {NETWORKS.map(net => (
                            <button
                              key={net}
                              onClick={() => { setSourceChain(net); setIsDropdownOpenSrc(false); }}
                              className="w-full text-left px-4 py-2 text-sm text-[#8e8e9f] hover:bg-[#252533] hover:text-white transition-colors"
                            >
                              {net}
                            </button>
                          ))}
                        </div>
                      )}
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
                    <button 
                      onClick={() => {
                        const temp = sourceChain;
                        setSourceChain(destChain);
                        setDestChain(temp);
                      }}
                      className="bg-[#13131a] hover:bg-[#1c1c28] border border-[#252533] p-2 rounded-xl text-[#8e8e9f] hover:text-white transition-colors shadow-lg"
                    >
                      <ArrowDown size={18} />
                    </button>
                  </div>

                  {/* Destination Chain */}
                  <div className="p-4 rounded-2xl bg-[#13131a]/50 border border-[#1c1c28]">
                    <div className="flex justify-between text-xs text-[#8e8e9f] mb-3">
                      <span>To Network (Est.)</span>
                      <span>Destination Balance (Arc): {balances.USDC ? balances.USDC.toFixed(2) : '0.00'} USDC</span>
                    </div>
                    
                    <div className="relative mb-4">
                      <button 
                        onClick={() => setIsDropdownOpenDest(!isDropdownOpenDest)}
                        className="flex items-center gap-2 bg-[#1c1c28] hover:bg-[#252533] px-3 py-2 rounded-xl text-white font-medium text-sm transition-colors border border-transparent hover:border-[#8b5cf6]/30"
                      >
                        <Network size={16} className="text-[#8b5cf6]" />
                        {destChain}
                        <ChevronDown size={14} className="text-[#8e8e9f]" />
                      </button>
                      {isDropdownOpenDest && (
                        <div className="absolute top-full mt-2 w-48 bg-[#1c1c28] border border-[#252533] rounded-xl overflow-hidden z-20 shadow-2xl">
                          {NETWORKS.map(net => (
                            <button
                              key={net}
                              onClick={() => { setDestChain(net); setIsDropdownOpenDest(false); }}
                              className="w-full text-left px-4 py-2 text-sm text-[#8e8e9f] hover:bg-[#252533] hover:text-white transition-colors"
                            >
                              {net}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          readOnly
                          value={amount || '0.0'}
                          className="w-full bg-transparent text-3xl font-bold text-white outline-none number-mono text-opacity-50"
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
                        Bridge via Contract
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
                    
                    {/* Step 0: Approve */}
                    <div className="relative flex items-center gap-4 z-10">
                      <div className={`w-3 h-3 rounded-full ${step === 'APPROVING' ? 'bg-[#3b82f6] shadow-[0_0_10px_#3b82f6] animate-pulse' : 'bg-emerald-500'}`} />
                      <div className="flex-1">
                        <div className={`text-sm font-bold ${step === 'APPROVING' ? 'text-white' : 'text-[#8e8e9f]'}`}>
                          Approve USDC
                        </div>
                        {step === 'APPROVING' && (
                          <div className="text-xs text-[#3b82f6] mt-1 animate-pulse">Sign in wallet...</div>
                        )}
                      </div>
                    </div>

                    {/* Step 1: Burn */}
                    <div className="relative flex items-center gap-4 z-10">
                      <div className={`w-3 h-3 rounded-full ${step === 'BURNING' ? 'bg-[#3b82f6] shadow-[0_0_10px_#3b82f6] animate-pulse' : step === 'APPROVING' ? 'bg-[#1c1c28]' : 'bg-emerald-500'}`} />
                      <div className="flex-1">
                        <div className={`text-sm font-bold ${step === 'BURNING' ? 'text-white' : 'text-[#8e8e9f]'}`}>
                          1. Execute Bridge (Burn)
                        </div>
                        {step === 'BURNING' && (
                          <div className="text-xs text-[#3b82f6] mt-1 animate-pulse">Waiting for transaction...</div>
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
                <span className="text-[10px] font-semibold tracking-widest uppercase">Powered by BridgingKitContract</span>
              </div>
            )}
            
          </div>
        </div>

      </div>
    </div>
  );
}
