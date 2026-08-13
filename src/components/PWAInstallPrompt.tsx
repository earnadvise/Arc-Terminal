"use client";

import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    // For testing/demo purposes if we want it to always show up after a delay
    // const timer = setTimeout(() => setIsVisible(true), 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      // clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-[#0b1016] border border-[#1c2834] shadow-[0_0_20px_rgba(16,185,129,0.1)] rounded-3xl p-3 flex items-center justify-between gap-3 overflow-hidden relative"
          >
            {/* Subtle green glow in background */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none"></div>

            <div className="flex items-center gap-3 relative z-10">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/20">
                <div className="relative w-7 h-7">
                  {/* Using a placeholder arc logo - or can replace with real logo */}
                  <div className="absolute inset-0 bg-emerald-500 rounded-full flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                     <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                     </svg>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-bold text-sm tracking-tight truncate">Install Arc Terminal</h3>
                  <span className="bg-emerald-500 text-[#030304] text-[10px] font-bold px-1.5 py-0.5 rounded-sm shrink-0 leading-none tracking-widest">PWA</span>
                </div>
                <p className="text-slate-400 text-xs mt-0.5 font-medium truncate">Fast, full-screen mobile trading on Arc Testnet</p>
              </div>
            </div>

            <div className="flex items-center gap-2 relative z-10 shrink-0">
              <button
                onClick={handleInstall}
                className="bg-emerald-500 hover:bg-emerald-400 text-[#030304] font-bold text-sm px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
              >
                <Download size={16} strokeWidth={2.5} />
                Install
              </button>
              <button
                onClick={handleClose}
                className="text-slate-500 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
                aria-label="Close prompt"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
