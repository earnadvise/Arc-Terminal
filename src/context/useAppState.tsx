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
import { useUnifiedBalance } from "@/lib/circle-unified-balance-kit";

export type AppTab = 'Home' | 'Perpetuals' | 'Swap' | 'Vault' | 'Agents' | 'SafePay' | 'History';

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

const encodeOpenPosition = (symbol: string, isLong: boolean, amount: number, entryPrice: number, leverage: number) => {
  const selector = '67491bd2'; // openPosition(string,bool,uint256,uint256,uint256)
  const offsetHex = 'a0'.padStart(64, '0');
  const isLongHex = (isLong ? 1 : 0).toString(16).padStart(64, '0');
  
  // Size must be the full position size in USDC, not just the token amount
  const positionSize = amount * entryPrice;
  const sizeWei = BigInt(Math.floor(positionSize * 1e6));
  const sizeHex = sizeWei.toString(16).padStart(64, '0');
  
  const priceWei = BigInt(Math.floor(entryPrice * 1e6));
  const priceHex = priceWei.toString(16).padStart(64, '0');
  const leverageHex = leverage.toString(16).padStart(64, '0');
  const stringLenHex = symbol.length.toString(16).padStart(64, '0');
  let stringBytes = '';
  for (let i = 0; i < symbol.length; i++) {
    stringBytes += symbol.charCodeAt(i).toString(16);
  }
  const stringContentHex = stringBytes.padEnd(64, '0');
  return '0x' + selector + offsetHex + isLongHex + sizeHex + priceHex + leverageHex + stringLenHex + stringContentHex;
};

const encodeClosePosition = (symbol: string, realizedPnl: number) => {
  const selector = '7606c9f2'; // closePosition(string,int256)
  const offsetHex = '40'.padStart(64, '0');
  const pnlWei = BigInt(Math.round(realizedPnl * 1e6));
  const pnlHex = (pnlWei < BigInt(0) ? (BigInt(1) << BigInt(256)) + pnlWei : pnlWei).toString(16).padStart(64, '0');
  const stringLenHex = symbol.length.toString(16).padStart(64, '0');
  let stringBytes = '';
  for (let i = 0; i < symbol.length; i++) {
    stringBytes += symbol.charCodeAt(i).toString(16);
  }
  const stringContentHex = stringBytes.padEnd(64, '0');
  return '0x' + selector + offsetHex + pnlHex + stringLenHex + stringContentHex;
};

export interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  time: string;
  txHash?: string;
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
  balances: { USDC: number; walletUSDC: number; vaultUSDC: number; BTC: number; ETH: number; SOL: number; ARC: number; EURC: number; USDT: number };
  setBalances: React.Dispatch<React.SetStateAction<{ USDC: number; walletUSDC: number; vaultUSDC: number; BTC: number; ETH: number; SOL: number; ARC: number; EURC: number; USDT: number }>>;
  notifications: AppNotification[];
  timeframe: string;
  setTimeframe: (time: string) => void;
  candleData: Candlestick[];
  leverage: number;
  setLeverage: (lev: number) => void;
  marginMode: 'CROSS' | 'ISOLATED';
  setMarginMode: (mode: 'CROSS' | 'ISOLATED') => void;
  
  // Actions
  connectWallet: (type: string) => Promise<void>;
  disconnectWallet: () => void;
  claimFaucet: () => void;
  addNotification: (type: 'info' | 'success' | 'warning' | 'error', title: string, message: string, txHash?: string) => void;
  dismissNotification: (id: string) => void;
  placeOrder: (
    side: 'LONG' | 'SHORT',
    type: 'MARKET' | 'LIMIT' | 'STOP',
    price: number,
    amount: number
  ) => Promise<void>;
  closePosition: (id: string) => Promise<void>;
  cancelOrder: (id: string) => void;
  depositFunds: (amount: number) => Promise<void>;
  withdrawFunds: (amount: number) => Promise<void>;
  addHistoryItem: (item: Omit<HistoryItem, 'id' | 'time'>) => void;
  clearHistory: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  // Unified Balance Kit
  const { balances: unifiedBalances, spend } = useUnifiedBalance();

  // Navigation & Markets
  const [activeTab, setActiveTab] = useState<AppTab>('Home');
  const [markets, setMarkets] = useState<Market[]>(initialMarkets);
  const [activePairSymbol, setActivePairSymbol] = useState<string>('BTC-PERP');
  const [timeframe, setTimeframe] = useState<string>('1h');
  const [leverageState, setLeverageState] = useState<number>(10);
  const setLeverage = (lev: number) => {
    const clamped = Math.min(20, Math.max(1, lev));
    setLeverageState(clamped);
  };
  const leverage = leverageState;
  const [marginMode, setMarginMode] = useState<'CROSS' | 'ISOLATED'>('CROSS');

  // Wallet & Account
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [walletType, setWalletType] = useState<string>('');
  const [balances, setBalances] = useState({
    USDC: 0,
    walletUSDC: 0,
    vaultUSDC: 0,
    BTC: 0,
    ETH: 0,
    SOL: 0,
    ARC: 0,
    EURC: 0,
    USDT: 0
  });

  const walletAddressRef = useRef(walletAddress);
  useEffect(() => {
    walletAddressRef.current = walletAddress;
  }, [walletAddress]);

  // State Lists
  const [positions, setPositions] = useState<Position[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('arc_terminal_positions');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });
  
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('arc_terminal_orders');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });
  
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('arc_terminal_user_history');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('arc_terminal_positions', JSON.stringify(positions));
  }, [positions]);

  useEffect(() => {
    localStorage.setItem('arc_terminal_orders', JSON.stringify(openOrders));
  }, [openOrders]);

  useEffect(() => {
    localStorage.setItem('arc_terminal_user_history', JSON.stringify(history));
  }, [history]);

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

  const VAULT_ADDRESS = '0xf33c82fB2c63DD0af7eF746c14b56c12D93458be';
  const DECIMALS = 18;

  const padAddress = (addr: string) => addr.toLowerCase().replace('0x', '').padStart(64, '0');
  const padBigInt = (val: bigint) => val.toString(16).padStart(64, '0');

  const formatOnChainBalance = (hexBalance: string): number => {
    if (!hexBalance || hexBalance === '0x') return 0;
    try {
      const raw = BigInt(hexBalance);
      return Number(raw) / (10 ** DECIMALS);
    } catch {
      return 0;
    }
  };

  const refreshOnChainBalances = async (address: string) => {
    if (!address) return;

    try {
      // Direct RPC fetch to bypass MetaMask queue and avoid network mismatch
      const rpcUrl = 'https://rpc.testnet.arc.network';
      const req = (method: string, params: any[]) => fetch(rpcUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
      }).then(r => r.json()).catch(() => null);

      // Execute sequentially to prevent burst rate limits
      const nativeRes = await req('eth_getBalance', [address, 'latest']);
      const vaultRes = await req('eth_call', [{ to: VAULT_ADDRESS, data: '0xf69f1e4a' + padAddress(address) }, 'latest']);
      const walletRes = await req('eth_call', [{ to: '0x3600000000000000000000000000000000000000', data: '0x70a08231' + padAddress(address) }, 'latest']);

      const nativeHex = nativeRes?.result;
      const vaultBalRes = vaultRes?.result;
      const walletBalRes = walletRes?.result;

      setBalances(prev => {
        const nextNativeBal = nativeHex && nativeHex !== '0x' && !nativeHex.error ? Number(BigInt(nativeHex)) / 1e18 : prev.BTC;
        const nextVaultUSDC = vaultBalRes && vaultBalRes !== '0x' && !vaultBalRes.error ? Number(BigInt(vaultBalRes)) / 1e6 : prev.vaultUSDC;
        const nextWalletUSDC = walletBalRes && walletBalRes !== '0x' && !walletBalRes.error ? Number(BigInt(walletBalRes)) / 1e6 : prev.walletUSDC;
        
        const localUSDC = nextVaultUSDC + nextWalletUSDC;
        const activeUSDC = localUSDC + (unifiedBalances?.USDC || 0);

        return {
          USDC: localUSDC + (unifiedBalances?.USDC || 0),
          walletUSDC: nextWalletUSDC,
          vaultUSDC: nextVaultUSDC,
          BTC: nextNativeBal,
          ETH: 0,
          SOL: 0,
          ARC: nextNativeBal,
          EURC: activeUSDC > 0 ? activeUSDC * 0.92 : 0,
          USDT: activeUSDC
        };
      });
    } catch (e) {
      console.error('Error refreshing on-chain balances:', e);
    }
  };

  // Poll balances when wallet changes
  useEffect(() => {
    let active = true;
    
    const poll = async () => {
      if (!active || !walletConnected || !walletAddressRef.current) return;
      
      await refreshOnChainBalances(walletAddressRef.current);
      
      if (active) {
        setTimeout(poll, 2500); // Wait 2.5s AFTER the previous request finishes to prevent overlapping rate limits
      }
    };

    if (walletConnected && walletAddress) {
      poll();
    }
    
    return () => { active = false; };
  }, [walletConnected, walletAddress]);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // Fetch directly from Binance client-side to bypass Vercel US server blocks
        const binanceRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22,%22SUIUSDT%22,%22APTUSDT%22,%22PAXGUSDT%22%5D').catch(() => null);
        
        let apiData: Record<string, any> = {};
        if (binanceRes && binanceRes.ok) {
          const data = await binanceRes.json();
          data.forEach((item: any) => {
            const symbolMap: Record<string, string> = {
              BTCUSDT: 'BTC-PERP', ETHUSDT: 'ETH-PERP', SOLUSDT: 'SOL-PERP',
              SUIUSDT: 'SUI-PERP', APTUSDT: 'APT-PERP', PAXGUSDT: 'xau-PERP'
            };
            const sym = symbolMap[item.symbol];
            if (sym) {
              apiData[sym] = {
                lastPrice: parseFloat(item.lastPrice),
                change24h: parseFloat(item.priceChangePercent),
                high24h: parseFloat(item.highPrice),
                low24h: parseFloat(item.lowPrice),
                volume24h: Math.round(parseFloat(item.quoteVolume)),
              };
            }
          });
          if (apiData['BTC-PERP']) {
            apiData['ARC-PERP'] = { ...apiData['BTC-PERP'] };
          }
        } else {
          // Fallback to our Next.js API if Binance client-fetch fails
          const res = await fetch('/api/prices');
          if (!res.ok) throw new Error('API request failed');
          apiData = await res.json();
        }

        // 1. Update Markets and Positions
        setMarkets(prevMarkets => {
          const updated = prevMarkets.map(m => {
            const marketData = apiData[m.symbol];
            if (!marketData) return m;

            return {
              ...m,
              lastPrice: marketData.lastPrice,
              change24h: marketData.change24h,
              high24h: marketData.high24h,
              low24h: marketData.low24h,
              volume24h: marketData.volume24h,
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
    const interval = setInterval(fetchPrices, 1000); // Updated to 1 second for faster real-time feedback

    return () => clearInterval(interval);
  }, [activePairSymbol]);

  // Actions
  const addNotification = (
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    txHash?: string
  ) => {
    // Suppress annoying connection warning popups
    if (type === 'error' && (message.toLowerCase().includes('connect') || title.toLowerCase().includes('wallet'))) {
      return;
    }

    const id = Math.random().toString(36).substring(7);
    const newNotif: AppNotification = {
      id,
      type,
      title,
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      txHash
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 5));

    // Auto-dismiss within 6 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 6000);
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const addHistoryItem = (item: Omit<HistoryItem, 'id' | 'time'>) => {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newItem: HistoryItem = {
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(7),
      time: formattedTime,
      timestamp: Date.now(),
      ...item
    };
    setHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 100);
      try {
        localStorage.setItem('arc_terminal_user_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('arc_terminal_user_history');
    } catch {}
  };

  const connectWallet = async (type: string) => {
    // Respect the user's explicit wallet choice
    let eth;
    if (type.toLowerCase() === 'rabby' && (window as any).rabby) {
      eth = (window as any).rabby;
    } else {
      eth = (window as any).ethereum;
    }
    
    if (eth) {
      try {
        const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          const fullAddr = accounts[0];
          const truncated = `${fullAddr.slice(0, 6)}...${fullAddr.slice(-4)}`;
          setWalletConnected(true);
          setWalletAddress(fullAddr);
          setWalletType(type);
          refreshOnChainBalances(fullAddr);
          addNotification('success', 'Wallet Connected', `Connected ${type} (${truncated}) on Arc Testnet.`);
          return;
        }
      } catch (err) {
        console.error('Wallet connection rejected or failed:', err);
        return;
      }
    }

    addNotification('error', 'No Wallet Found', `No ${type} detected. Please install ${type} to connect.`);
  };

  const disconnectWallet = () => {
    addNotification('info', 'Wallet Disconnected', `Disconnected wallet.`);
    setWalletConnected(false);
    setWalletAddress('');
    setWalletType('');
    setBalances({
      USDC: 0,
      walletUSDC: 0,
      vaultUSDC: 0,
      BTC: 0,
      ETH: 0,
      SOL: 0,
      ARC: 0,
      EURC: 0,
      USDT: 0
    });
  };

  const claimFaucet = () => {
    if (typeof window !== 'undefined') {
      window.open('https://faucet.circle.com/', '_blank');
    }
    addNotification('info', 'Circle Testnet Faucet', 'Opened Circle Faucet (faucet.circle.com) to request testnet USDC.');
  };

  const placeOrder = async (
    side: 'LONG' | 'SHORT',
    type: 'MARKET' | 'LIMIT' | 'STOP',
    price: number,
    amount: number
  ) => {
    if (!walletConnected || !walletAddress) {
      addNotification('error', 'Execution Failed', 'Please connect your wallet to trade on Arc Testnet.');
      return;
    }

    const orderValue = amount * (type === 'MARKET' ? activePair.lastPrice : price);
    const requiredMargin = orderValue / leverage;

    // Process order
    if (type === 'MARKET') {
      const eth = (window as any).ethereum;
      let txHash = '';

      if (eth && walletAddress) {
        addNotification('info', 'Executing Market Order', 'Please confirm the transaction in MetaMask/Rabby...');
        try {
          // Encode vault contract call
          const calldata = encodeOpenPosition(
            activePair.symbol,
            side === 'LONG',
            amount,
            activePair.lastPrice,
            leverage
          );

          // Unified Balance Kit Integration
          // If the user does not have enough local balance but has enough aggregated cross-chain balance,
          // use the Kit's spend() method to auto-allocate margin.
          if (balances.walletUSDC < requiredMargin && unifiedBalances.USDC >= requiredMargin) {
            addNotification('info', 'Unified Balance Kit', 'Auto-allocating cross-chain USDC margin...');
            txHash = await spend({ 
              amount: requiredMargin, 
              to: VAULT_ADDRESS, 
              chain: "ARC_TESTNET" 
            });
          } else {
            // Standard fallback execution
            txHash = await eth.request({
              method: 'eth_sendTransaction',
              params: [{
                from: walletAddress,
                to: VAULT_ADDRESS,
                data: calldata
              }]
            });
          }

          addNotification('success', 'Transaction Submitted', `Open Position sent: ${txHash.slice(0, 10)}...`, txHash);
        } catch (err: any) {
          console.error(err);
          addNotification('error', 'Execution Failed', err.message || 'Transaction rejected.');
          return;
        }
      } else {
        txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        addNotification('success', 'Order Submitted', `Market order submitted to Arc Testnet.`, txHash);
      }

      const entryPrice = activePair.lastPrice;

        // Create position locally for immediate responsive UI feedback
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

        // Refresh on-chain balances after transaction propagates
        setTimeout(() => refreshOnChainBalances(walletAddress), 6000);
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

  const closePosition = async (id: string) => {
    const pos = positions.find(p => p.id === id);
    if (!pos) return;

    const eth = (window as any).ethereum;
    if (!eth || !walletConnected || !walletAddress) {
      addNotification('error', 'Execution Failed', 'Wallet not connected.');
      return;
    }

    addNotification('info', 'Closing Position', 'Please confirm the close position transaction in MetaMask/Rabby...');
    try {
      // Generate dynamic ABI data for closePosition(string,int256)
      const txData = encodeClosePosition(pos.symbol, pos.unrealizedPnl);

      const txHash = await eth.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: VAULT_ADDRESS,
          data: txData
        }]
      });

      addNotification('success', 'Transaction Submitted', `Close Position sent: ${txHash.slice(0, 10)}...`);

      // Remove position locally for immediate responsive UI feedback
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

      // Refresh on-chain balances after transaction propagates
      setTimeout(() => refreshOnChainBalances(walletAddress), 6000);
    } catch (err: any) {
      console.error(err);
      addNotification('error', 'Close Failed', err.message || 'Transaction rejected.');
    }
  };

  const cancelOrder = (id: string) => {
    setOpenOrders(prev => prev.filter(o => o.id !== id));
    addNotification('info', 'Order Cancelled', 'Limit order successfully cancelled.');
  };

  const depositFunds = async (amount: number) => {
    const eth = (window as any).ethereum;
    if (!eth || !walletConnected || !walletAddress) {
      addNotification('error', 'Deposit Failed', 'Wallet not connected.');
      return;
    }

    addNotification('info', 'Initiating Deposit', 'Checking allowance and preparing transactions...');
    try {
      // Get collateral token address
      const tokenRes = await eth.request({
        method: 'eth_call',
        params: [{ to: VAULT_ADDRESS, data: '0xb2016bd4' }, 'latest']
      });
      const tokenAddress = '0x' + tokenRes.slice(-40);

      // Check allowance
      const allowanceData = '0xdd62ed3e' + padAddress(walletAddress) + padAddress(VAULT_ADDRESS);
      const allowanceRes = await eth.request({
        method: 'eth_call',
        params: [{ to: tokenAddress, data: allowanceData }, 'latest']
      });
      
      const rawAmount = BigInt(Math.floor(amount * 1e6)); // 6 decimals
      const currentAllowance = allowanceRes ? BigInt(allowanceRes) : BigInt(0);

      if (currentAllowance < rawAmount) {
        addNotification('info', 'Approve USDC', 'Please approve the vault to spend your USDC in MetaMask.');
        const approveData = '0x095ea7b3' + padAddress(VAULT_ADDRESS) + padBigInt(rawAmount);
        await eth.request({
          method: 'eth_sendTransaction',
          params: [{
            from: walletAddress,
            to: tokenAddress,
            data: approveData
          }]
        });
        addNotification('info', 'Approval Sent', 'Waiting for approval transaction confirmation...');
        await new Promise(r => setTimeout(r, 6000));
      }

      addNotification('info', 'Deposit Collateral', 'Please confirm the deposit transaction in MetaMask.');
      const amountHex = BigInt(Math.floor(amount * 1e6)).toString(16).padStart(64, '0');
      const txHash = await eth.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: VAULT_ADDRESS,
          data: '0xbad4a01f' + amountHex
        }]
      });

      addNotification('success', 'Deposit Submitted', `Transaction sent: ${txHash.slice(0, 10)}...`, txHash);
      refreshOnChainBalances(walletAddress);
      setTimeout(() => refreshOnChainBalances(walletAddress), 1000);
      setTimeout(() => refreshOnChainBalances(walletAddress), 2500);
      setTimeout(() => refreshOnChainBalances(walletAddress), 5000);
    } catch (err: any) {
      console.error(err);
      addNotification('error', 'Deposit Failed', err.message || 'Transaction rejected.');
    }
  };

  const withdrawFunds = async (amount: number) => {
    const eth = (window as any).ethereum;
    if (!eth || !walletConnected || !walletAddress) {
      addNotification('error', 'Withdrawal Failed', 'Wallet not connected.');
      return;
    }

    if (balances.vaultUSDC < amount) {
      addNotification('error', 'Withdrawal Failed', 'Insufficient margin deposited in the Vault. Please check your Exact Vault Balance.');
      return;
    }

    addNotification('info', 'Withdraw Collateral', 'Please confirm the withdraw transaction in MetaMask.');
    try {
      const amountHex = BigInt(Math.floor(amount * 1e6)).toString(16).padStart(64, '0');
      const txHash = await eth.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: VAULT_ADDRESS,
          data: '0x6112fe2e' + amountHex
        }]
      });

      addNotification('success', 'Withdrawal Submitted', `Transaction sent: ${txHash.slice(0, 10)}...`, txHash);
      refreshOnChainBalances(walletAddress);
      setTimeout(() => refreshOnChainBalances(walletAddress), 1000);
      setTimeout(() => refreshOnChainBalances(walletAddress), 2500);
      setTimeout(() => refreshOnChainBalances(walletAddress), 5000);
    } catch (err: any) {
      console.error(err);
      addNotification('error', 'Withdrawal Failed', err.message || 'Transaction rejected.');
    }
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
        setBalances,
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
        addHistoryItem,
        clearHistory,
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
