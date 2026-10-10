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
    let active = true;
    const fetchRealBalances = async () => {
      if (!apiKey || typeof window === 'undefined' || !(window as any).ethereum) return;
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        if (!accounts || accounts.length === 0) return;
        const address = accounts[0];

        const { ethers } = await import('ethers');
        const ERC20_ABI = ["function balanceOf(address owner) view returns (uint256)"];
        
        const chains = [
          { name: 'Arbitrum', rpc: 'https://arb1.arbitrum.io/rpc', token: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
          { name: 'Ethereum', rpc: 'https://eth.llamarpc.com', token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
          { name: 'Base', rpc: 'https://mainnet.base.org', token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
          { name: 'Polygon', rpc: 'https://polygon.llamarpc.com', token: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' }
        ];

        let total = 0;
        const details: { chain: string, amount: number }[] = [];

        await Promise.all(chains.map(async (c) => {
          try {
            const provider = new ethers.JsonRpcProvider(c.rpc);
            const contract = new ethers.Contract(c.token, ERC20_ABI, provider);
            const bal = await contract.balanceOf(address);
            const formatted = Number(ethers.formatUnits(bal, 6));
            if (formatted > 0) {
              total += formatted;
              details.push({ chain: c.name, amount: formatted });
            }
          } catch (e) {
            console.warn(`Failed to fetch on ${c.name}`, e);
          }
        }));

        if (active) {
          setUnifiedUSDC(total);
          setCrossChainDetails(details);
        }
      } catch (e) {
        console.error("Unified Balance fetch error", e);
      }
    };
    
    fetchRealBalances();
    // Poll every 10 seconds
    const interval = setInterval(fetchRealBalances, 10000);
    return () => { active = false; clearInterval(interval); };
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
