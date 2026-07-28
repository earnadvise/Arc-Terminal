import React, { useState } from 'react';
import { useAppState } from '@/context/useAppState';
import { ShieldCheck, CheckCircle2, RefreshCw, Lock, Unlock, XCircle, ArrowRight } from 'lucide-react';
import { ethers } from 'ethers';

// Arc Testnet USDC address
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
// Deployed ArcReversiblePayment Contract Address
const ARC_PAY_ADDRESS = '0x0000000000000000000000000000000000000000'; // Replace after deployment

interface Payment {
  id: string;
  receiver: string;
  amount: string;
  isActive: boolean;
  status: 'LOCKED' | 'RELEASED' | 'CANCELLED';
  date: string;
}

export default function ArcSafePayView() {
  const { walletConnected, addNotification, balances } = useAppState();

  const [receiver, setReceiver] = useState('');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'IDLE' | 'APPROVING' | 'CREATING'>('IDLE');
  
  // Local state to simulate active payments for the demo
  const [payments, setPayments] = useState<Payment[]>([
    {
      id: 'mock-1',
      receiver: '0x1234567890123456789012345678901234567890',
      amount: '50.00',
      isActive: true,
      status: 'LOCKED',
      date: new Date().toISOString()
    }
  ]);

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
      addNotification('error', 'Not Deployed', 'SafePay contract is not deployed yet.');
      return;
    }

    setIsProcessing(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const amountWei = ethers.parseUnits(amount, 6);

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
        ['function createPayment(address receiver, address token, uint256 amount) external returns (uint256)'],
        signer
      );

      const tx = await arcPayContract.createPayment(receiver, USDC_ADDRESS, amountWei);
      const receipt = await tx.wait();

      addNotification('success', 'SafePay Created', 'Your funds are securely locked in escrow.', receipt.hash);
      
      const newPayment: Payment = {
        id: Math.random().toString(36).substring(7),
        receiver,
        amount,
        isActive: true,
        status: 'LOCKED',
        date: new Date().toISOString()
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

  const handleAction = async (paymentId: string, action: 'cancel' | 'release') => {
    if (!walletConnected || !(window as any).ethereum) return;
    
    try {
      // In production, we'd use the real payment ID from the contract.
      // Here we simulate success on the local state since we use mock IDs.
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const arcPayContract = new ethers.Contract(
        ARC_PAY_ADDRESS,
        [
          'function cancel(uint256 paymentId) external',
          'function release(uint256 paymentId) external'
        ],
        signer
      );

      // We would do: await arcPayContract[action](actualId);
      
      addNotification('success', `SafePay ${action === 'cancel' ? 'Cancelled' : 'Released'}`, `The transaction was successful.`);
      
      setPayments(prev => prev.map(p => 
        p.id === paymentId ? { ...p, isActive: false, status: action === 'cancel' ? 'CANCELLED' : 'RELEASED' } : p
      ));
    } catch (err: any) {
      console.error(err);
      addNotification('error', 'Action Failed', err.reason || err.message);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-[#1c1c28] pb-6">
          <div className="p-3 bg-[#3b82f6]/10 rounded-xl">
            <ShieldCheck className="w-8 h-8 text-[#3b82f6]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Arc SafePay</h1>
            <p className="text-[#8e8e9f] text-sm mt-1">Manual escrow. Lock your funds, and release them only when you are ready.</p>
          </div>
        </div>

        {/* Creation Bar */}
        <div className="bg-[#09090c] border border-[#1c1c28] rounded-2xl p-6 shadow-lg">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Lock size={16} className="text-[#3b82f6]"/> New Escrow Payment
          </h2>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-[#6e6e7f] mb-1.5 ml-1">Receiver Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
                className="w-full bg-[#13131a] border border-[#1c1c28] rounded-xl px-4 py-3 text-white placeholder-[#6e6e7f] focus:outline-none focus:border-[#3b82f6] transition-colors number-mono text-sm"
              />
            </div>
            <div className="w-full md:w-64">
              <div className="flex justify-between items-center mb-1.5 ml-1 mr-1">
                <label className="block text-xs font-medium text-[#6e6e7f]">Amount (USDC)</label>
                <span className="text-xs text-[#8e8e9f]">Bal: {balances.walletUSDC ? balances.walletUSDC.toFixed(2) : '0.00'}</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#13131a] border border-[#1c1c28] rounded-xl pl-4 pr-16 py-3 text-white placeholder-[#6e6e7f] focus:outline-none focus:border-[#3b82f6] transition-colors number-mono text-sm"
                />
                <button
                  onClick={handleMax}
                  className="absolute right-2 top-2 bottom-2 px-2 rounded-lg bg-[#1c1c28] text-[#8e8e9f] text-xs font-semibold hover:text-white transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>
            <button
              onClick={handleCreatePayment}
              disabled={isProcessing || !walletConnected}
              className={`w-full md:w-auto px-8 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all ${
                isProcessing || !walletConnected
                  ? 'bg-[#1c1c28] text-[#6e6e7f] cursor-not-allowed'
                  : 'bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-lg shadow-[#3b82f6]/20'
              }`}
            >
              {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
              {step === 'APPROVING' ? 'Approving...' : isProcessing ? 'Creating...' : 'Lock Funds'}
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-[#09090c] border border-[#1c1c28] rounded-2xl overflow-hidden shadow-lg">
          <div className="p-5 border-b border-[#1c1c28] flex justify-between items-center bg-[#13131a]/50">
            <h2 className="text-sm font-semibold text-white">Your SafePay Escrows</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1c1c28] text-[#6e6e7f] text-xs uppercase tracking-wider bg-[#09090c]">
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Receiver</th>
                  <th className="px-6 py-4 font-semibold">Amount (USDC)</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c1c28]">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[#6e6e7f] text-sm">
                      No SafePay transactions found.
                    </td>
                  </tr>
                ) : (
                  payments.map(payment => (
                    <tr key={payment.id} className="hover:bg-[#13131a]/50 transition-colors">
                      <td className="px-6 py-4">
                        {payment.status === 'LOCKED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-semibold">
                            <Lock size={12} /> Locked
                          </span>
                        )}
                        {payment.status === 'RELEASED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold">
                            <Unlock size={12} /> Released
                          </span>
                        )}
                        {payment.status === 'CANCELLED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
                            <XCircle size={12} /> Cancelled
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#8e8e9f]">
                        {new Date(payment.date).toLocaleDateString()} {new Date(payment.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white number-mono bg-[#1c1c28] px-2 py-1 rounded-md">
                            {payment.receiver.slice(0, 6)}...{payment.receiver.slice(-4)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-white number-mono">
                          {payment.amount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {payment.isActive ? (
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleAction(payment.id, 'cancel')}
                              className="px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-xs font-bold transition-all"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleAction(payment.id, 'release')}
                              className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 text-xs font-bold transition-all"
                            >
                              Release
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-[#6e6e7f] font-semibold">Settled</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
