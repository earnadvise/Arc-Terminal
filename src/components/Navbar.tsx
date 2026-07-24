'use client';

import React, { useState } from 'react';
import { useAppState, AppTab } from '@/context/useAppState';
import {
  Wallet, Coins, ChevronDown, LogOut, ShieldAlert,
  Home as HomeIcon, Activity, Compass, History as HistIcon,
  ArrowLeftRight, Network, Vault as VaultIcon, Bot
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
    { id: 'Vault',      label: 'Arc Vault',  icon: <VaultIcon size={15} /> },
    { id: 'Agents',     label: 'Arc Agents', icon: <Bot size={15} /> },
    { id: 'Portfolio',  label: 'Portfolio',  icon: <Compass size={15} /> },
    { id: 'History',    label: 'History',    icon: <HistIcon size={15} /> },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[#13131a] bg-[#030304]/80 backdrop-blur-md px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setActiveTab('Home')}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center font-bold text-sm tracking-widest shadow-[0_0_15px_rgba(139,92,246,0.5)] group-hover:scale-105 transition-transform duration-200">
              A
            </div>
            <span className="text-lg font-bold tracking-wider bg-gradient-to-r from-white to-[#a3a3c2] bg-clip-text text-transparent group-hover:text-white transition-colors">
              ARC TERMINAL
            </span>
          </div>

          {/* Nav Links */}
          <nav className="hidden xl:flex items-center gap-1">
            {navItems.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setIsDropdownOpen(false); }}
                  className={`relative px-4 py-1.5 rounded-md text-sm font-medium tracking-wide flex items-center gap-1.5 transition-all duration-200 ${
                    isActive ? 'text-white' : 'text-[#8e8e9f] hover:text-[#c7c7d6] hover:bg-[#13131a]/50'
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
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#09090c] border border-[#13131a] text-xs font-semibold text-[#8b5cf6]">
            <Network size={14} className="animate-pulse" />
            <span className="hidden sm:inline">Arc Testnet</span>
          </div>

          {/* Faucet */}
          <button
            onClick={claimFaucet}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#3b82f6]/15 to-[#8b5cf6]/15 border border-[#8b5cf6]/30 hover:border-[#8b5cf6]/70 text-[#c7c7d6] hover:text-white text-xs font-semibold transition-all duration-250"
          >
            <Coins size={14} className="text-[#8b5cf6]" />
            Claim Faucet
          </button>

          {/* Wallet */}
          {walletConnected ? (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#09090c] border border-[#13131a] hover:border-[#3b82f6]/50 text-sm font-medium text-white transition-all duration-200"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="number-mono text-xs">
                  {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : ''}
                </span>
                <ChevronDown size={14} className="text-[#8e8e9f]" />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-56 rounded-xl bg-[#09090c] border border-[#13131a] p-3 shadow-2xl z-50"
                  >
                    <div className="text-xs text-[#8e8e9f] mb-2 px-1">Margin Balance</div>
                    <div className="number-mono text-lg font-bold text-white mb-3 px-1">
                      ${balances.USDC.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                      <span className="text-xs text-[#8b5cf6]">USDC</span>
                    </div>
                    <div className="h-[1px] bg-[#13131a] mb-2" />
                    <button
                      onClick={() => { disconnectWallet(); setIsDropdownOpen(false); }}
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
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:from-[#4f8ff7] hover:to-[#996cf7] text-white text-sm font-semibold shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-200"
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
              className="relative w-full max-w-md rounded-2xl bg-[#09090c] border border-[#13131a] p-6 shadow-2xl z-10"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Connect Wallet</h3>
                  <p className="text-xs text-[#8e8e9f] mt-1">Connect to Arc Testnet to trade</p>
                </div>
                <button onClick={() => setIsWalletModalOpen(false)} className="text-[#8e8e9f] hover:text-white">✕</button>
              </div>

              <div className="grid gap-3">
                {['MetaMask', 'Rabby', 'WalletConnect', 'Coinbase Wallet'].map(wallet => (
                  <button
                    key={wallet}
                    onClick={async () => { await connectWallet(wallet); setIsWalletModalOpen(false); }}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-[#0d0d12] border border-[#13131a] hover:border-[#8b5cf6]/50 hover:bg-[#13131c]/50 transition-all duration-200 text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#181822] flex items-center justify-center group-hover:scale-105 transition-transform">
                        <span className="text-xs font-bold text-[#8b5cf6]">{wallet.substring(0, 2)}</span>
                      </div>
                      <span className="text-sm font-semibold text-white group-hover:text-[#8b5cf6] transition-colors">{wallet}</span>
                    </div>
                    <span className="text-xs text-[#8e8e9f] bg-[#13131a] px-2 py-0.5 rounded-md">Detected</span>
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
