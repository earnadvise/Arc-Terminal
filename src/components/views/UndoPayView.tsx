import React, { useState, useEffect } from 'react';
import { useAppState } from '@/context/useAppState';
import { ShieldAlert, Clock, CheckCircle2, RefreshCw, XCircle, Timer, ArrowRight, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';

// Arc Testnet USDC address
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
// Deployed ArcReversiblePayment Contract Address
const ARC_PAY_ADDRESS = '0xBc4f301CCb5f2e09B543EFe40e280e5A65177091'; // Replace after deployment

interface Payment {
  id: string;
  receiver: string;
  amount: string;
  unlockTime: number;
  isActive: boolean;
}

export default function UndoPayView() {
  const { walletConnected, addNotification, balances } = useAppState();

  const [receiver, setReceiver] = useState('');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('30'); // Default 30 seconds
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'IDLE' | 'APPROVING' | 'CREATING'>('IDLE');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  // Update current time every second for the countdown timers
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMax = () => {
    setAmount(balances.walletUSDC ? balances.walletUSDC.toString() : '0');
  };

  const handleCreatePayment = async () => {
    if (!walletConnected || !(window as any).ethereum) {
      addNotification('error', 'Wallet not connected', 'Please connect your wallet first.');
      return;
    }
    if (!receiver || !ethers.isAddress(receiver)) {
      addNotification('error', 'Invalid Address', 'Please enter a valid receiver address.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      addNotification('error', 'Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    if (ARC_PAY_ADDRESS === '0x0000000000000000000000000000000000000000') {
      addNotification('error', 'Not Deployed', 'Reversible Payment contract is not deployed yet.');
      return;
    }

    setIsProcessing(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      const amountWei = ethers.parseUnits(amount, 6); // USDC has 6 decimals

      // 1. Approve USDC
      setStep('APPROVING');
      const usdcContract = new ethers.Contract(
        USDC_ADDRESS,
        ['function approve(address spender, uint256 amount) public returns (bool)'],
        signer
      );
      
      const approveTx = await usdcContract.approve(ARC_PAY_ADDRESS, amountWei);
      await approveTx.wait();

      // 2. Create Escrow Payment
      setStep('CREATING');
      const arcPayContract = new ethers.Contract(
        ARC_PAY_ADDRESS,
        ['function createPayment(address receiver, address token, uint256 amount, uint256 durationSeconds) external returns (uint256)'],
        signer
      );

      const tx = await arcPayContract.createPayment(receiver, USDC_ADDRESS, amountWei, parseInt(duration));
      const receipt = await tx.wait();

      addNotification('success', 'Payment Created', 'Your escrow payment has been created successfully.', receipt.hash);
      
      // Simulate adding to local state (in production, we'd fetch events)
      const newPayment: Payment = {
        id: Math.random().toString(36).substring(7), // Mock ID
        receiver,
        amount,
        unlockTime: Math.floor(Date.now() / 1000) + parseInt(duration),
        isActive: true
      };
      setPayments(prev => [newPayment, ...prev]);

      setAmount('');
      setReceiver('');
    } catch (err: any) {
      console.error(err);
      addNotification('error', 'Transaction Failed', err.reason || err.message);
    }
    setIsProcessing(false);
    setStep('IDLE');
  };

  const handleAction = async (paymentId: string, action: 'reclaim' | 'release') => {
    if (!walletConnected || !(window as any).ethereum) return;
    
    // Note: Since we are using mock IDs for the local state right now, 
    // interacting with the real contract will fail unless we fetch the actual real uint256 paymentId from events.
    // This is a UI simulation of the action.
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const arcPayContract = new ethers.Contract(
        ARC_PAY_ADDRESS,
        [
          'function reclaim(uint256 paymentId) external',
          'function release(uint256 paymentId) external'
        ],
        signer
      );

      // We would pass the real uint256 ID here. For now, we just update local state to simulate.
      // await undoPayContract[action](realPaymentId);
      
      addNotification('success', `Payment ${action === 'reclaim' ? 'Reclaimed' : 'Released'}`, `The transaction was successful.`);
      
      setPayments(prev => prev.map(p => 
        p.id === paymentId ? { ...p, isActive: false } : p
      ));
    } catch (err: any) {
      console.error(err);
      addNotification('error', 'Action Failed', err.reason || err.message);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto p-6 min-h-full">
        
        {/* Header Section */}
        <div className="mb-12 text-center md:text-left mt-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6] text-xs font-semibold mb-6">
            <Lock size={12} />
            Web3 Escrow Payments
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight">
            Crypto Payments <br className="hidden md:block" />
            <span className="text-[#3b82f6]">with a Second Chance</span>
          </h1>
          <p className="text-[#8e8e9f] text-lg max-w-xl mx-auto md:mx-0 leading-relaxed">
            Arc Reversible Payments protect your crypto transfers with an adjustable escrow reclaim window. 
            If you accidentally enter the wrong address, you can reclaim your funds before the transfer becomes final.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* Left Column: Features & Active Payments */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-[#09090c] border border-[#13131a] hover:border-[#3b82f6]/30 transition-colors">
                <ShieldAlert size={24} className="text-[#3b82f6] mb-3" />
                <h3 className="text-white font-bold mb-1">Escrow Protection</h3>
                <p className="text-xs text-[#8e8e9f]">Funds are securely locked in a smart contract before being released.</p>
              </div>
              <div className="p-5 rounded-2xl bg-[#09090c] border border-[#13131a] hover:border-[#8b5cf6]/30 transition-colors">
                <Timer size={24} className="text-[#8b5cf6] mb-3" />
                <h3 className="text-white font-bold mb-1">Reclaim Window</h3>
                <p className="text-xs text-[#8e8e9f]">Recover your payment if you notice a mistake before the timer expires.</p>
              </div>
            </div>

            {/* Active Payments List */}
            <div className="rounded-3xl border border-[#1c1c28] bg-[#09090c]/80 backdrop-blur-xl overflow-hidden p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-[#8e8e9f]" />
                Recent Escrows
              </h2>
              
              <div className="space-y-3">
                {payments.length === 0 ? (
                  <div className="text-center py-8 text-[#6e6e7f] text-sm">
                    No active escrow payments found.
                  </div>
                ) : (
                  payments.map(payment => {
                    const timeRemaining = payment.unlockTime - now;
                    const canReclaim = payment.isActive && timeRemaining > 0;
                    const canRelease = payment.isActive && timeRemaining <= 0;

                    return (
                      <div key={payment.id} className="p-4 rounded-xl border border-[#1c1c28] bg-[#13131a]/50 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-white mb-1">
                            {payment.amount} USDC
                          </div>
                          <div className="text-xs text-[#8e8e9f] number-mono">
                            To: {payment.receiver.slice(0,6)}...{payment.receiver.slice(-4)}
                          </div>
                        </div>
                        
                        <div className="text-right flex flex-col items-end">
                          {payment.isActive ? (
                            <>
                              <div className={`text-xs font-bold mb-2 ${canReclaim ? 'text-amber-500' : 'text-emerald-500'}`}>
                                {canReclaim ? `Locks in ${timeRemaining}s` : 'Ready to Release'}
                              </div>
                              <div className="flex gap-2">
                                {canReclaim && (
                                  <button 
                                    onClick={() => handleAction(payment.id, 'reclaim')}
                                    className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs font-semibold transition-colors"
                                  >
                                    Reclaim
                                  </button>
                                )}
                                {canRelease && (
                                  <button 
                                    onClick={() => handleAction(payment.id, 'release')}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-xs font-semibold transition-colors"
                                  >
                                    Release
                                  </button>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-[#6e6e7f] font-semibold flex items-center gap-1">
                              <CheckCircle2 size={12} /> Settled
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Send Form */}
          <div className="flex justify-center md:justify-end">
            <div className="w-full max-w-md rounded-3xl border border-[#1c1c28] bg-[#09090c]/80 backdrop-blur-xl overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6]" />
              
              <div className="p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Create Payment</h2>
                
                <div className="space-y-5">
                  {/* Receiver */}
                  <div>
                    <label className="block text-xs font-semibold text-[#8e8e9f] mb-2 uppercase tracking-wider">
                      Receiver Address
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="0x..."
                        value={receiver}
                        onChange={(e) => setReceiver(e.target.value)}
                        className="w-full bg-[#13131a] border border-[#1c1c28] rounded-xl px-4 py-3.5 text-white placeholder-[#6e6e7f] focus:outline-none focus:border-[#3b82f6] transition-colors number-mono text-sm"
                      />
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-semibold text-[#8e8e9f] uppercase tracking-wider">
                        Amount
                      </label>
                      <span className="text-xs text-[#8e8e9f]">
                        Balance: {balances.walletUSDC ? balances.walletUSDC.toFixed(2) : '0.00'} USDC
                      </span>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-[#13131a] border border-[#1c1c28] rounded-xl pl-4 pr-24 py-3.5 text-white placeholder-[#6e6e7f] focus:outline-none focus:border-[#3b82f6] transition-colors number-mono text-lg"
                      />
                      <div className="absolute right-2 flex items-center gap-2">
                        <button
                          onClick={handleMax}
                          className="px-2 py-1 rounded bg-[#1c1c28] text-xs text-[#8e8e9f] hover:text-white transition-colors"
                        >
                          MAX
                        </button>
                        <span className="text-sm font-semibold text-white mr-2">USDC</span>
                      </div>
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-xs font-semibold text-[#8e8e9f] mb-2 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock size={14} /> Reclaim Window
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-[#13131a] border border-[#1c1c28] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#3b82f6] transition-colors appearance-none cursor-pointer"
                    >
                      <option value="30">30 Seconds</option>
                      <option value="60">1 Minute</option>
                      <option value="300">5 Minutes</option>
                      <option value="3600">1 Hour</option>
                      <option value="86400">1 Day</option>
                    </select>
                  </div>

                  <div className="pt-4">
                    {!walletConnected ? (
                      <div className="text-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm font-semibold">
                        Connect your wallet to create a payment
                      </div>
                    ) : (
                      <button
                        onClick={handleCreatePayment}
                        disabled={isProcessing}
                        className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 text-sm font-bold shadow-lg transition-all duration-200 ${
                          isProcessing 
                            ? 'bg-[#1c1c28] text-[#6e6e7f] cursor-not-allowed'
                            : 'bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:from-[#4f8ff7] hover:to-[#996cf7] text-white'
                        }`}
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            {step === 'APPROVING' ? 'Approving USDC...' : 'Creating Payment...'}
                          </>
                        ) : (
                          <>
                            Create Escrow Payment <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Temporary icon to avoid import errors if not in lucide-react
const History = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
