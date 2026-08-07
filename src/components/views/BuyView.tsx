'use client';

import React, { useState } from 'react';
import { useAppState } from '@/context/useAppState';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, DollarSign, Wallet, ShieldCheck, ArrowRight, Smartphone, Zap, QrCode } from 'lucide-react';

export default function BuyView() {
  const { walletConnected, addNotification, balances, setBalances, walletAddress } = useAppState();
  
  const [amount, setAmount] = useState<string>('100');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP'>('USD');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'applepay' | 'googlepay'>('applepay');

  const exchangeRates = {
    USD: 1.0,
    EUR: 1.09,
    GBP: 1.27
  };

  const usdcAmount = (parseFloat(amount || '0') * exchangeRates[currency]).toFixed(2);

  const handleBuyClick = () => {
    if (!walletConnected) {
      addNotification('error', 'Wallet Not Connected', 'Please connect your wallet to buy crypto.');
      return;
    }

    const val = parseFloat(amount);
    if (isNaN(val) || val < 10) {
      addNotification('error', 'Invalid Amount', 'Minimum purchase is $10.');
      return;
    }
    
    setShowModal(true);
  };

  const confirmPurchase = () => {
    setShowModal(false);
    setIsProcessing(true);
    addNotification('info', 'Processing Payment', `Initiating secure checkout with ${paymentMethod === 'applepay' ? 'Apple Pay' : paymentMethod === 'googlepay' ? 'Google Pay' : 'Credit Card'}...`);

    // Simulate fiat payment processing & on-ramp
    setTimeout(() => {
      addNotification('info', 'Payment Successful', 'Fiat payment cleared. Minting USDC on Arc Testnet...');
      
      setTimeout(() => {
        setIsProcessing(false);
        const receivedUsdc = parseFloat(usdcAmount);
        setBalances(prev => ({ ...prev, USDC: prev.USDC + receivedUsdc }));
        addNotification('success', 'Purchase Complete', `Successfully bought ${receivedUsdc} USDC on Arc Testnet!`);
        setAmount('100');
      }, 2500);
    }, 3000);
  };

  return (
    <div className="flex-1 flex flex-col items-center py-12 px-4 overflow-auto bg-slate-50">
      <div className="text-center mb-10 max-w-2xl">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4 flex justify-center items-center gap-3">
          BUY CRYPTO <Zap className="text-yellow-400 fill-yellow-400" size={32} />
        </h1>
        <p className="text-slate-500 text-lg leading-relaxed font-light">
          Skip the bridge. Buy USDC directly onto the <span className="font-semibold text-slate-900">Arc Network</span> using your credit card or Apple Pay.
        </p>
      </div>

      <div className="w-full max-w-[480px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 relative overflow-visible"
        >
          {/* You Pay Section */}
          <div className="mb-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-500 tracking-wider">YOU PAY</span>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent text-4xl font-black text-slate-900 outline-none placeholder:text-slate-300"
                placeholder="0"
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="bg-white border border-slate-200 text-slate-900 font-bold py-2 px-4 rounded-xl outline-none cursor-pointer shadow-sm"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div className="flex justify-center -my-3 relative z-10">
            <div className="bg-white border border-slate-200 p-2 rounded-xl text-slate-400 shadow-sm">
              <ArrowRight size={20} className="rotate-90" />
            </div>
          </div>

          {/* You Receive Section */}
          <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-500 tracking-wider">YOU RECEIVE</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-4xl font-black text-slate-900">{usdcAmount}</span>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                <div className="w-6 h-6 rounded-full bg-[#2775ca] flex items-center justify-center text-white font-bold text-[10px]">
                  $
                </div>
                <span className="font-bold text-slate-900">USDC</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 bg-white/50 w-fit px-3 py-1 rounded-lg">
              <Wallet size={12} className="text-blue-500" />
              On <span className="font-semibold text-slate-900">Arc Testnet</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="mb-6">
            <span className="text-xs font-bold text-slate-500 tracking-wider mb-3 block">PAYMENT METHOD</span>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setPaymentMethod('applepay')}
                className={`py-3 px-2 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                  paymentMethod === 'applepay'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                <Smartphone size={18} />
                <span className="font-bold text-xs">Apple Pay</span>
              </button>
              <button
                onClick={() => setPaymentMethod('googlepay')}
                className={`py-3 px-2 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                  paymentMethod === 'googlepay'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                <Smartphone size={18} />
                <span className="font-bold text-xs">Google Pay</span>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`py-3 px-2 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                  paymentMethod === 'card'
                    ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                <CreditCard size={18} />
                <span className="font-bold text-xs">Card</span>
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="mb-6 space-y-3 px-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Exchange Rate</span>
              <span className="font-medium text-slate-900">1 {currency} = {(1/exchangeRates[currency]).toFixed(2)} USDC</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Network Fee</span>
              <span className="font-medium text-green-500">Free (Sponsored)</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleBuyClick}
            disabled={isProcessing || !walletConnected}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-sm flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden ${
              isProcessing 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : paymentMethod === 'applepay'
                  ? 'bg-slate-900 hover:bg-black text-white'
                  : paymentMethod === 'googlepay'
                  ? 'bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-900'
                  : 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white'
            }`}
          >
            {isProcessing && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full translate-x-[-100%] animate-[shimmer_1.5s_infinite]"></div>
            )}
            
            {isProcessing ? (
              <span className="flex items-center gap-2 relative z-10">
                <span className="w-5 h-5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                Processing...
              </span>
            ) : !walletConnected ? (
              'Connect Wallet to Buy'
            ) : paymentMethod === 'applepay' ? (
              <>Buy with <span className="font-black">Apple Pay</span></>
            ) : paymentMethod === 'googlepay' ? (
              <>Buy with <span className="font-black">Google Pay</span></>
            ) : (
              'Buy with Card'
            )}
          </button>
          
          <div className="mt-5 flex justify-center items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck size={14} className="text-green-500" />
            <span>Secure checkout powered by Stripe</span>
          </div>
        </motion.div>
      </div>

      {/* Payment Sheet Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-slate-200"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    {paymentMethod === 'applepay' && <><Smartphone size={18} /> Apple Pay</>}
                    {paymentMethod === 'googlepay' && <><Smartphone size={18} /> G Pay</>}
                    {paymentMethod === 'card' && <><CreditCard size={18} /> Checkout</>}
                  </h3>
                  <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                    ✕
                  </button>
                </div>
                
                <div className="text-center mb-6">
                  <div className="text-sm text-slate-500 mb-1">Total to Pay</div>
                  <div className="text-4xl font-black text-slate-900">{amount} {currency}</div>
                </div>

                {(paymentMethod === 'applepay' || paymentMethod === 'googlepay') && (
                  <div className="flex flex-col items-center justify-center mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 mb-3">
                      <QrCode size={100} className="text-slate-800" strokeWidth={1.5} />
                    </div>
                    <span className="text-sm font-semibold text-slate-600 text-center">
                      Scan with your phone to complete payment securely.
                    </span>
                  </div>
                )}

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500">Item</span>
                    <span className="font-medium">{usdcAmount} USDC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Destination</span>
                    <span className="font-medium text-xs font-mono">{walletAddress?.slice(0,6)}...{walletAddress?.slice(-4)}</span>
                  </div>
                </div>

                <button
                  onClick={confirmPurchase}
                  className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-md transition-all ${
                    paymentMethod === 'applepay' ? 'bg-black hover:bg-slate-800' :
                    paymentMethod === 'googlepay' ? 'bg-blue-600 hover:bg-blue-700' :
                    'bg-fuchsia-600 hover:bg-fuchsia-700'
                  }`}
                >
                  Confirm Payment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
