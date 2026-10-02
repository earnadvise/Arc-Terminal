'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface UnifiedBalanceContextType {
  balances: { USDC: number };
  crossChainDetails?: { chain: string, amount: number }[];
  spend: (args: { amount: number; to: string; chain: string }) => Promise<string>;
}

const UnifiedBalanceContext = createContext<UnifiedBalanceContextType | undefined>(undefined);

export const UnifiedBalanceProvider = ({ apiKey, children }: { apiKey: string; children: React.ReactNode }) => {
  const [unifiedUSDC, setUnifiedUSDC] = useState(0);
  const [crossChainDetails, setCrossChainDetails] = useState<{chain: string, amount: number}[]>([]);

  useEffect(() => {
    // Simulate aggregating cross-chain balances via the Kit
    if (apiKey) {
      setTimeout(() => {
        setUnifiedUSDC(4500);
        setCrossChainDetails([
          { chain: 'Arbitrum', amount: 2500 },
          { chain: 'Ethereum', amount: 2000 }
        ]);
      }, 1500); 
    }
  }, [apiKey]);

  const spend = async ({ amount, to, chain }: { amount: number; to: string; chain: string }) => {
    console.log('[Unified Balance Kit] Executing cross-chain spend of ' + amount + ' to ' + to + ' on ' + chain);
    // Simulate cross-chain intent processing delay (CCTP)
    await new Promise(resolve => setTimeout(resolve, 2000));
    setUnifiedUSDC(prev => Math.max(0, prev - amount));
    return '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  };

  return (
    <UnifiedBalanceContext.Provider value={{ balances: { USDC: unifiedUSDC }, crossChainDetails, spend } as any}>
      {children}
    </UnifiedBalanceContext.Provider>
  );
};

export const useUnifiedBalance = () => {
  const context = useContext(UnifiedBalanceContext);
  if (context === undefined) {
    throw new Error('useUnifiedBalance must be used within a UnifiedBalanceProvider');
  }
  return context;
};
