'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Market,
  Candlestick,
  Position,
  OpenOrder,
  HistoryItem,
  initialMarkets,
  generateCandlesticks,
  initialHistory
} from '../utils/mockData';

export type AppTab = 'Markets' | 'Perpetuals' | 'Portfolio' | 'History' | 'Swap';

const getPrecision = (symbol: string): number => {
  const s = symbol.toLowerCase();
  if (s.startsWith('eur') || s.startsWith('gbp') || s.startsWith('sui') || s.startsWith('apt')) {
    return 4;
  }
  if (s.startsWith('xag')) {
    return 3;
  }
  return 2;
};

export interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  time: string;
}

interface AppContextType {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  markets: Market[];
  activePair: Market;
  setActivePairBySymbol: (symbol: string) => void;
  positions: Position[];
  openOrders: OpenOrder[];
  history: HistoryItem[];
  walletConnected: boolean;
  walletAddress: string;
  walletType: string;
  balances: { USDC: number; BTC: number; ETH: number; SOL: number; ARC: number };
  notifications: AppNotification[];
  timeframe: string;
  setTimeframe: (time: string) => void;
  candleData: Candlestick[];
  leverage: number;
  setLeverage: (lev: number) => void;
  marginMode: 'CROSS' | 'ISOLATED';
  setMarginMode: (mode: 'CROSS' | 'ISOLATED') => void;
  
  // Actions
  connectWallet: (type: string) => void;
  disconnectWallet: () => void;
  claimFaucet: () => void;
  addNotification: (type: 'info' | 'success' | 'warning' | 'error', title: string, message: string) => void;
  dismissNotification: (id: string) => void;
  placeOrder: (
    side: 'LONG' | 'SHORT',
    type: 'MARKET' | 'LIMIT' | 'STOP',
    price: number,
    amount: number
  ) => void;
  closePosition: (id: string) => void;
  cancelOrder: (id: string) => void;
  depositFunds: (amount: number) => void;
  withdrawFunds: (amount: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  // Navigation & Markets
  const [activeTab, setActiveTab] = useState<AppTab>('Markets');
  const [markets, setMarkets] = useState<Market[]>(initialMarkets);
  const [activePairSymbol, setActivePairSymbol] = useState<string>('BTC-PERP');
  const [timeframe, setTimeframe] = useState<string>('1h');
  const [leverage, setLeverage] = useState<number>(10);
  const [marginMode, setMarginMode] = useState<'CROSS' | 'ISOLATED'>('CROSS');

  // Wallet & Account
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [walletType, setWalletType] = useState<string>('');
  const [balances, setBalances] = useState({
    USDC: 5000,
    BTC: 0,
    ETH: 0,
    SOL: 0,
    ARC: 0
  });

  // State Lists
  const [positions, setPositions] = useState<Position[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Candle Chart Data cache per market-timeframe
  const [candleData, setCandleData] = useState<Candlestick[]>([]);
  
  // Keep track of active pair object
  const activePair = markets.find(m => m.symbol === activePairSymbol) || markets[0];

  // Load initial chart data
  useEffect(() => {
    setCandleData(generateCandlesticks(activePair.lastPrice, 80, timeframe));
  }, [activePairSymbol, timeframe]);

  // Keep refs of state variables to avoid resetting the fetch interval unnecessarily
  const marketsRef = useRef(markets);
  const activePairRef = useRef(activePair);
  useEffect(() => {
    marketsRef.current = markets;
    activePairRef.current = activePair;
  }, [markets, activePair]);

  const tickCounter = useRef<number>(0);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('/api/prices');
        if (!res.ok) throw new Error('API request failed');
        const data = await res.json();
        
        // 1. Update Markets and Positions
        setMarkets(prevMarkets => {
          const updated = prevMarkets.map(m => {
            const apiData = data[m.symbol];
            if (!apiData) return m;

            return {
              ...m,
              lastPrice: apiData.lastPrice,
              change24h: apiData.change24h,
              high24h: apiData.high24h,
              low24h: apiData.low24h,
              volume24h: apiData.volume24h,
            };
          });

          // Trigger updates in positions PnL based on these new prices
          setPositions(prevPos =>
            prevPos.map(pos => {
              const currentMarket = updated.find(m => m.symbol === pos.symbol);
              if (!currentMarket) return pos;

              const markPrice = currentMarket.lastPrice;
              const diff = pos.side === 'LONG' 
                ? (markPrice - pos.entryPrice) 
                : (pos.entryPrice - markPrice);
              
              const unrealizedPnl = Number((diff * pos.size).toFixed(2));
              return {
                ...pos,
                markPrice,
                unrealizedPnl
              };
            })
          );

          return updated;
        });
      } catch (err) {
        console.error('Error fetching live prices, falling back to simulated drift:', err);
        // Fallback: apply mock drift
        setMarkets(prevMarkets => {
          const updated = prevMarkets.map(m => {
            const changePercent = (Math.random() - 0.49) * 0.0015; // slightly positive drift
            const priceChange = m.lastPrice * changePercent;
            const newPrice = Number((m.lastPrice + priceChange).toFixed(m.symbol.includes('USDC') || m.symbol.includes('PERP') ? 2 : 4));
            const high = Math.max(m.high24h, newPrice);
            const low = Math.min(m.low24h, newPrice);
            
            // Re-calculate 24h percentage
            const initialRef = m.prevPrice;
            const newChange24h = Number((((newPrice - initialRef) / initialRef) * 100).toFixed(2));
            
            return {
              ...m,
              lastPrice: newPrice,
              change24h: newChange24h,
              high24h: high,
              low24h: low,
              volume24h: m.volume24h + Math.round(Math.random() * 5000)
            };
          });

          // Trigger updates in positions PnL based on fallback prices
          setPositions(prevPos =>
            prevPos.map(pos => {
              const currentMarket = updated.find(m => m.symbol === pos.symbol);
              if (!currentMarket) return pos;

              const markPrice = currentMarket.lastPrice;
              const diff = pos.side === 'LONG' 
                ? (markPrice - pos.entryPrice) 
                : (pos.entryPrice - markPrice);
              
              const unrealizedPnl = Number((diff * pos.size).toFixed(2));
              return {
                ...pos,
                markPrice,
                unrealizedPnl
              };
            })
          );

          return updated;
        });
      }

      // 2. Update current active candlestick
      setCandleData(prevCandles => {
        if (prevCandles.length === 0) return prevCandles;
        const last = { ...prevCandles[prevCandles.length - 1] };
        
        // Find latest price from active pair ref
        const currentActive = marketsRef.current.find(m => m.symbol === activePairSymbol) || activePairRef.current;
        const latestPrice = currentActive.lastPrice;
        last.close = latestPrice;
        last.high = Math.max(last.high, latestPrice);
        last.low = Math.min(last.low, latestPrice);
        last.volume += Math.floor(Math.random() * 100);

        // Every 20 ticks (approx 1 min if interval is 3s), append a new candle
        tickCounter.current += 1;
        if (tickCounter.current >= 20) {
          tickCounter.current = 0;
          const newTime = new Date();
          const timeStr = newTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          return [
            ...prevCandles.slice(1),
            last,
            {
              time: timeStr,
              open: latestPrice,
              high: latestPrice,
              low: latestPrice,
              close: latestPrice,
              volume: 0
            }
          ];
        }

        return [...prevCandles.slice(0, -1), last];
      });


    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 3000);

    return () => clearInterval(interval);
  }, [activePairSymbol]);

  // Actions
  const addNotification = (
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string
  ) => {
    const id = Math.random().toString(36).substring(7);
    const newNotif: AppNotification = {
      id,
      type,
      title,
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 10)); // limit 10 notifications
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const connectWallet = (type: string) => {
    const addresses: Record<string, string> = {
      MetaMask: '0x7F9e...82A1',
      Rabby: '0x3cD2...E415',
      WalletConnect: '0x9aE1...01B8',
      'Coinbase Wallet': '0x5C0b...d99F'
    };

    const mockAddr = addresses[type] || '0x0000...0000';
    setWalletConnected(true);
    setWalletAddress(mockAddr);
    setWalletType(type);
    addNotification('success', 'Wallet Connected', `Successfully connected ${type} (${mockAddr}) on Arc Testnet.`);
  };

  const disconnectWallet = () => {
    addNotification('info', 'Wallet Disconnected', `Disconnected ${walletType} wallet.`);
    setWalletConnected(false);
    setWalletAddress('');
    setWalletType('');
  };

  const claimFaucet = () => {
    if (!walletConnected) {
      addNotification('error', 'Faucet Error', 'Please connect your wallet first.');
      return;
    }
    
    // Increment USDC balance
    setBalances(prev => ({
      ...prev,
      USDC: prev.USDC + 10000
    }));

    addNotification('success', 'Arc Testnet Faucet', 'Successfully claimed 10,000 test USDC, 0.1 BTC, and 1 ETH to your testnet margin account.');

    // Add faucet tx to history
    const historyItem: HistoryItem = {
      id: `tx-${Math.random().toString(36).substring(7)}`,
      time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      pair: 'USDC',
      side: 'DEPOSIT',
      type: 'Faucet',
      size: '10,000 USDC',
      price: '$1.00',
      fee: '$0.00 USDC',
      status: 'SUCCESS'
    };

    setHistory(prev => [historyItem, ...prev]);
  };

  const placeOrder = (
    side: 'LONG' | 'SHORT',
    type: 'MARKET' | 'LIMIT' | 'STOP',
    price: number,
    amount: number
  ) => {
    if (!walletConnected) {
      addNotification('error', 'Execution Failed', 'Please connect your wallet to trade on Arc Testnet.');
      return;
    }

    const orderValue = amount * (type === 'MARKET' ? activePair.lastPrice : price);
    const requiredMargin = orderValue / leverage;

    if (balances.USDC < requiredMargin) {
      addNotification('error', 'Insufficient Margin', `Required Margin ($${requiredMargin.toFixed(2)}) exceeds available USDC ($${balances.USDC.toFixed(2)}).`);
      return;
    }

    // Process order
    if (type === 'MARKET') {
      // Create position immediately
      const entryPrice = activePair.lastPrice;
      
      // Calculate liquidation price
      // Long: Liq = Entry * (1 - 1/leverage) + margin buffer
      // Short: Liq = Entry * (1 + 1/leverage) - margin buffer
      const buffer = marginMode === 'ISOLATED' ? 0.95 : 0.98;
      const liqPrice = side === 'LONG'
        ? entryPrice * (1 - (1 / leverage) * buffer)
        : entryPrice * (1 + (1 / leverage) * buffer);

      const newPosition: Position = {
        id: `pos-${Math.random().toString(36).substring(7)}`,
        symbol: activePair.symbol,
        side,
        size: amount,
        entryPrice,
        markPrice: entryPrice,
        liqPrice: Number(liqPrice.toFixed(getPrecision(activePair.symbol))),
        margin: Number(requiredMargin.toFixed(2)),
        leverage,
        unrealizedPnl: 0,
        marginMode
      };

      setPositions(prev => [newPosition, ...prev]);
      
      // Deduct margin from available USDC
      setBalances(prev => ({
        ...prev,
        USDC: Number((prev.USDC - requiredMargin).toFixed(2))
      }));

      addNotification(
        'success',
        'Position Opened',
        `Market order filled. Opened ${side} ${amount} ${activePair.symbol} at $${entryPrice.toFixed(getPrecision(activePair.symbol))}.`
      );

      // Add to history
      const historyItem: HistoryItem = {
        id: `tx-${Math.random().toString(36).substring(7)}`,
        time: new Date().toISOString().replace('T', ' ').substring(0, 19),
        pair: activePair.symbol,
        side: side === 'LONG' ? 'LONG' : 'SHORT',
        type: 'Market',
        size: `${amount} ${activePair.symbol.split('-')[0]}`,
        price: `$${entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        fee: `$${(orderValue * 0.0006).toFixed(2)} USDC`,
        status: 'FILLED'
      };
      setHistory(prev => [historyItem, ...prev]);

    } else {
      // Limit or Stop orders go to Open Orders
      const newOrder: OpenOrder = {
        id: `ord-${Math.random().toString(36).substring(7)}`,
        symbol: activePair.symbol,
        side: side === 'LONG' ? 'BUY' : 'SELL',
        type,
        price,
        amount,
        leverage,
        marginMode,
        status: 'OPEN',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setOpenOrders(prev => [newOrder, ...prev]);
      addNotification(
        'info',
        'Order Placed',
        `${type} order to ${side === 'LONG' ? 'BUY' : 'SELL'} ${amount} ${activePair.symbol} placed at $${price.toFixed(getPrecision(activePair.symbol))}.`
      );
    }
  };

  const closePosition = (id: string) => {
    const pos = positions.find(p => p.id === id);
    if (!pos) return;

    // Return margin + PnL to balances
    const closingValue = pos.margin + pos.unrealizedPnl;
    
    setBalances(prev => ({
      ...prev,
      USDC: Number((prev.USDC + closingValue).toFixed(2))
    }));

    // Remove position
    setPositions(prev => prev.filter(p => p.id !== id));

    addNotification(
      'success',
      'Position Closed',
      `Closed ${pos.side} position on ${pos.symbol} at mark price $${pos.markPrice.toFixed(getPrecision(pos.symbol))}. PnL: $${pos.unrealizedPnl.toFixed(2)}`
    );

    // Record close in history
    const historyItem: HistoryItem = {
      id: `tx-${Math.random().toString(36).substring(7)}`,
      time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      pair: pos.symbol,
      side: pos.side === 'LONG' ? 'SELL' : 'BUY',
      type: 'Market (Close)',
      size: `${pos.size} ${pos.symbol.split('-')[0]}`,
      price: `$${pos.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      fee: `$${((pos.size * pos.markPrice) * 0.0006).toFixed(2)} USDC`,
      status: 'FILLED'
    };
    setHistory(prev => [historyItem, ...prev]);

  };

  const cancelOrder = (id: string) => {
    setOpenOrders(prev => prev.filter(o => o.id !== id));
    addNotification('info', 'Order Cancelled', 'Limit order successfully cancelled.');
  };

  const depositFunds = (amount: number) => {
    setBalances(prev => ({
      ...prev,
      USDC: Number((prev.USDC + amount).toFixed(2))
    }));
    addNotification('success', 'Margin Deposited', `Deposited $${amount.toFixed(2)} USDC into trading margin.`);
  };

  const withdrawFunds = (amount: number) => {
    if (balances.USDC < amount) {
      addNotification('error', 'Withdrawal Failed', 'Insufficient available margin.');
      return;
    }
    setBalances(prev => ({
      ...prev,
      USDC: Number((prev.USDC - amount).toFixed(2))
    }));
    addNotification('success', 'Funds Withdrawn', `Withdrew $${amount.toFixed(2)} USDC from margin account.`);
  };

  const setActivePairBySymbol = (symbol: string) => {
    setActivePairSymbol(symbol);
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        markets,
        activePair,
        setActivePairBySymbol,
        positions,
        openOrders,
        history,
        walletConnected,
        walletAddress,
        walletType,
        balances,
        notifications,
        timeframe,
        setTimeframe,
        candleData,
        leverage,
        setLeverage,
        marginMode,
        setMarginMode,

        connectWallet,
        disconnectWallet,
        claimFaucet,
        addNotification,
        dismissNotification,
        placeOrder,
        closePosition,
        cancelOrder,
        depositFunds,
        withdrawFunds
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
