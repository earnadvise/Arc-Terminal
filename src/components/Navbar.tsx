'use client';

import React, { useState } from 'react';
import { useAppState, AppTab } from '@/context/useAppState';
import {
  Wallet, Coins, ChevronDown, LogOut, ShieldAlert,
  Home as HomeIcon, Activity, Compass, History as HistIcon,
  ArrowLeftRight, Network, Vault as VaultIcon, Bot, Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const {
    activeTab, setActiveTab,
    walletConnected, walletAddress, walletType,
    balances, connectWallet, disconnectWallet, claimFaucet
  } = useAppState();

  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const navItems: { id: AppTab; label: string; icon: React.ReactNode }[] = [
    { id: 'Home',       label: 'Home',       icon: <HomeIcon size={15} /> },
    { id: 'Perpetuals', label: 'Perpetuals', icon: <Activity size={15} /> },
    { id: 'Swap',       label: 'Swap',       icon: <ArrowLeftRight size={15} /> },
    { id: 'Vault',      label: 'Vault',      icon: <VaultIcon size={15} /> },
    { id: 'Bridge',     label: 'Bridge',     icon: <Network size={15} /> },
    { id: 'SafePay',    label: 'SafePay', icon: <Bot size={15} /> },
    { id: 'Agents',     label: 'Arc AI',  icon: <Bot size={15} /> },
    { id: 'History',    label: 'History',    icon: <HistIcon size={15} /> },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-sky-50/80 backdrop-blur-md px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <div
            className="flex items-center gap-1 cursor-pointer group"
            onClick={() => setActiveTab('Home')}
          >
            <img 
              src="/logo.jpg" 
              alt="Arc Terminal Logo" 
              className="w-10 h-10 rounded-lg shadow-md shadow-violet-200 group-hover:scale-105 transition-transform duration-200 object-cover" 
            />
            <span className="text-lg font-bold tracking-wider bg-gradient-to-r from-slate-900 to-slate-500 bg-clip-text text-transparent group-hover:text-slate-900 transition-colors">
              ARC TERMINAL AI
            </span>
          </div>

          {/* Nav Links */}
          <nav className="flex flex-wrap items-center gap-1">
            {navItems.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    setActiveTab(item.id); 
                    setIsDropdownOpen(false); 
                  }}
                  className={`relative px-4 py-1.5 rounded-md text-sm font-medium tracking-wide flex items-center gap-1.5 transition-all duration-200 ${
                    isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                  }`}
                >
                  {item.icon}
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavTab"
                      className="absolute inset-0 bg-gradient-to-r from-[#3b82f6]/10 to-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-md -z-10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Testnet badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-[#8b5cf6]">
            <Network size={14} className="animate-pulse" />
            <span className="hidden sm:inline">Arc Testnet</span>
          </div>

          {/* Faucet */}
          <button
            onClick={claimFaucet}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#3b82f6]/15 to-[#8b5cf6]/15 border border-[#8b5cf6]/30 hover:border-[#8b5cf6]/70 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-all duration-250"
          >
            <Coins size={14} className="text-[#8b5cf6]" />
            Claim Faucet
          </button>

          {/* Wallet */}
          {walletConnected ? (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-[#3b82f6]/50 text-sm font-medium text-slate-900 transition-all duration-200"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="number-mono text-xs">
                  {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : ''}
                </span>
                <ChevronDown size={14} className="text-slate-500" />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-slate-200 p-3 shadow-2xl z-50"
                  >
                    <div className="text-xs text-slate-500 mb-2 px-1">Margin Balance</div>
                    <div className="number-mono text-lg font-bold text-slate-900 mb-3 px-1">
                      ${balances.USDC.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                      <span className="text-xs text-[#8b5cf6]">USDC</span>
                    </div>
                    <div className="h-[1px] bg-slate-100 mb-2" />
                    <button
                      type="button"
                      onClick={(e) => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        disconnectWallet(); 
                        setIsDropdownOpen(false); 
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-sm text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors"
                    >
                      <LogOut size={16} /> Disconnect
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              onClick={() => setIsWalletModalOpen(true)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:from-[#4f8ff7] hover:to-[#996cf7] text-slate-900 text-sm font-semibold shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-200"
            >
              <Wallet size={16} /> Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Wallet Modal */}
      <AnimatePresence>
        {isWalletModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWalletModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl z-10"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Connect Wallet</h3>
                  <p className="text-xs text-slate-500 mt-1">Connect to Arc Testnet to trade</p>
                </div>
                <button onClick={() => setIsWalletModalOpen(false)} className="text-slate-500 hover:text-slate-900">✕</button>
              </div>

              <div className="grid gap-3">
                {['MetaMask', 'Rabby', 'WalletConnect', 'Coinbase Wallet'].map(wallet => (
                  <button
                    key={wallet}
                    onClick={async () => { await connectWallet(wallet); setIsWalletModalOpen(false); }}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-[#8b5cf6]/50 hover:bg-slate-100/50 transition-all duration-200 text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <span className="text-xs font-bold text-[#8b5cf6]">{wallet.substring(0, 2)}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 group-hover:text-[#8b5cf6] transition-colors">{wallet}</span>
                    </div>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">Detected</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2 items-center mt-6 px-3 py-3 rounded-lg bg-[#ef4444]/5 border border-[#ef4444]/15">
                <ShieldAlert size={16} className="text-[#ef4444] shrink-0" />
                <p className="text-[10px] text-[#ef4444]/90 leading-normal">
                  Make sure you are on the <strong>Arc Testnet</strong>. Never deposit real funds.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
