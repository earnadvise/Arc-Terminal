'use client';

import React from 'react';
import { useAppState } from '@/context/useAppState';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

import LandingView    from '@/components/views/LandingView';
import PerpetualsView from '@/components/views/PerpetualsView';
import HistoryView    from '@/components/views/HistoryView';
import SwapView       from '@/components/views/SwapView';
import VaultView      from '@/components/views/VaultView';
import BridgeView     from '@/components/views/BridgeView';
import BuyView        from '@/components/views/BuyView';
import ArcSafePayView from '@/components/views/ArcSafePayView';
import AgentsView     from '@/components/views/AgentsView';

import { Info, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoonPayProvider } from '@moonpay/moonpay-react';

export default function Home() {
  const { activeTab, notifications, dismissNotification } = useAppState();

  const renderView = () => {
    switch (activeTab) {
      case 'Home':       return <LandingView />;
      case 'Perpetuals': return <PerpetualsView />;
      case 'Swap':       return <SwapView />;
      case 'Vault':      return <VaultView />;
      case 'Bridge':     return <BridgeView />;
      case 'Buy':        return <BuyView />;
      case 'SafePay':    return <ArcSafePayView />;
      case 'Agents':     return <AgentsView />;
      case 'History':    return <HistoryView />;
      default:           return <LandingView />;
    }
  };

  const iconFor = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-[#10b981]" size={18} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={18} />;
      case 'error':   return <XCircle className="text-[#ef4444]" size={18} />;
      default:        return <Info className="text-[#3b82f6]" size={18} />;
    }
  };

  const borderFor = (type: string) => {
    switch (type) {
      case 'success': return 'border-[#10b981]/25 bg-[#10b981]/5';
      case 'warning': return 'border-amber-500/25 bg-amber-500/5';
      case 'error':   return 'border-[#ef4444]/25 bg-[#ef4444]/5';
      default:        return 'border-[#3b82f6]/25 bg-[#3b82f6]/5';
    }
  };

  return (
    <MoonPayProvider
      apiKey={process.env.NEXT_PUBLIC_MOONPAY_API_KEY || 'pk_test_Zq2LjJ7xtslzKhGonKwxAqRt7tbvcTs'}
      environment="sandbox"
      debug={true}
    >
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-sky-100 to-sky-300">
      <Navbar />

      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="flex-1 flex flex-col"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </div>

      <Footer />

      {/* Floating Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              className={`p-4 rounded-xl border flex gap-3 shadow-2xl backdrop-blur-md pointer-events-auto bg-white/90 border-sky-100`}
            >
              <div className="shrink-0 mt-0.5">{iconFor(n.type)}</div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                  <button onClick={() => dismissNotification(n.id)} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={14} />
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal">{n.message}</p>
                {n.txHash && (
                  <a
                    href={n.explorerUrl ? `${n.explorerUrl}/tx/${n.txHash}` : `https://testnet.arcscan.app/tx/${n.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-[#8b5cf6] hover:text-[#a78bfa] transition-colors"
                  >
                    View on Explorer ↗
                  </a>
                )}
                <span className="text-[8px] text-slate-400 number-mono mt-1.5 block">{n.time}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
    </MoonPayProvider>
  );
}
