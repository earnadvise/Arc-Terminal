'use client';

import React from 'react';
import { useAppState } from '@/context/useAppState';
import { MoonPayProvider, MoonPayBuyWidget } from '@moonpay/moonpay-react';
import { Zap, ShieldCheck } from 'lucide-react';

const MemoizedMoonPayWidget = React.memo(({ walletAddress }: { walletAddress?: string }) => {
  return (
    <MoonPayBuyWidget
      variant="embedded"
      baseCurrencyCode="usd"
      baseCurrencyAmount="100"
      defaultCurrencyCode="usdc"
      walletAddress={walletAddress}
      colorCode="#1e293b"
      visible={true}
    />
  );
}, (prevProps, nextProps) => prevProps.walletAddress === nextProps.walletAddress);

export default function BuyView() {
  const { walletAddress, walletConnected } = useAppState();

  return (
    <div className="flex-1 flex flex-col items-center py-12 px-4 overflow-auto bg-slate-50">
      <div className="text-center mb-10 max-w-2xl">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4 flex justify-center items-center gap-3">
          BUY CRYPTO <Zap className="text-yellow-400 fill-yellow-400" size={32} />
        </h1>
        <p className="text-slate-500 text-lg leading-relaxed font-light">
          Skip the bridge. Buy USDC directly onto the <span className="font-semibold text-slate-900">Arc Network</span> using MoonPay.
        </p>
      </div>

      <div className="w-full max-w-[480px]">
        {!walletConnected ? (
           <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-12 text-center">
             <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
               <ShieldCheck size={32} />
             </div>
             <h3 className="text-xl font-bold text-slate-900 mb-2">Connect Wallet</h3>
             <p className="text-slate-500 mb-6">Please connect your wallet first to purchase crypto directly to your address.</p>
           </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 min-h-[600px] relative">
            <MemoizedMoonPayWidget walletAddress={walletAddress || undefined} />
          </div>
        )}
      </div>
    </div>
  );
}
