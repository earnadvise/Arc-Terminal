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

export type AppTab = 'Home' | 'Perpetuals' | 'Swap' | 'Vault' | 'Bridge' | 'Buy' | 'SafePay' | 'Agents' | 'History';

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

const encodePlaceLimitOrder = (symbol: string, isLong: boolean, size: number, targetPrice: number, leverage: number) => {
  const selector = '28d8681f'; // placeLimitOrder(string,bool,uint256,uint256,uint256)
  const offsetHex = 'a0'.padStart(64, '0');
  const isLongHex = (isLong ? 1 : 0).toString(16).padStart(64, '0');
  // Use targetPrice to compute sizeWei so it matches the UI's margin requirements!
  const positionSize = size * targetPrice;
  const sizeWei = BigInt(Math.floor(positionSize * 1e6));
  const sizeHex = sizeWei.toString(16).padStart(64, '0');
  const priceWei = BigInt(Math.floor(targetPrice * 1e6));
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

const encodeSetTPSL = (symbol: string, takeProfit: number, stopLoss: number) => {
  const selector = '2a71bbc3'; // setTPSL(string,uint256,uint256)
  const offsetHex = '60'.padStart(64, '0');
  const tpWei = BigInt(Math.floor(takeProfit * 1e6));
  const tpHex = tpWei.toString(16).padStart(64, '0');
  const slWei = BigInt(Math.floor(stopLoss * 1e6));
  const slHex = slWei.toString(16).padStart(64, '0');
  const stringLenHex = symbol.length.toString(16).padStart(64, '0');
  let stringBytes = '';
  for (let i = 0; i < symbol.length; i++) {
    stringBytes += symbol.charCodeAt(i).toString(16);
  }
  const stringContentHex = stringBytes.padEnd(64, '0');
  return '0x' + selector + offsetHex + tpHex + slHex + stringLenHex + stringContentHex;
};

const encodeCancelLimitOrder = (symbol: string, size: number, entryPrice: number, leverage: number) => {
  const selector = '66be0122'; // cancelLimitOrder(string,uint256,uint256)
  const offsetHex = '60'.padStart(64, '0');
  const positionSize = size * entryPrice;
  const sizeWei = BigInt(Math.floor(positionSize * 1e6));
  const sizeHex = sizeWei.toString(16).padStart(64, '0');
  const leverageHex = leverage.toString(16).padStart(64, '0');
  const stringLenHex = symbol.length.toString(16).padStart(64, '0');
  let stringBytes = '';
  for (let i = 0; i < symbol.length; i++) {
    stringBytes += symbol.charCodeAt(i).toString(16);
  }
  const stringContentHex = stringBytes.padEnd(64, '0');
  return '0x' + selector + offsetHex + sizeHex + leverageHex + stringLenHex + stringContentHex;
};

const encodeClosePosition = (symbol: string, size: number, entryPrice: number, leverage: number, realizedPnl: number) => {
  const selector = '3943dbfb'; // closePosition(string,uint256,uint256,int256)
  const offsetHex = '80'.padStart(64, '0');
  
  const positionSize = size * entryPrice;
  const sizeWei = BigInt(Math.floor(positionSize * 1e6));
  const sizeHex = sizeWei.toString(16).padStart(64, '0');
  
  const leverageHex = leverage.toString(16).padStart(64, '0');
  
  const pnlWei = BigInt(Math.round(realizedPnl * 1e6));
  const pnlHex = (pnlWei < BigInt(0) ? (BigInt(1) << BigInt(256)) + pnlWei : pnlWei).toString(16).padStart(64, '0');
  
  const stringLenHex = symbol.length.toString(16).padStart(64, '0');
  let stringBytes = '';
  for (let i = 0; i < symbol.length; i++) {
    stringBytes += symbol.charCodeAt(i).toString(16);
  }
  const stringContentHex = stringBytes.padEnd(64, '0');
  return '0x' + selector + offsetHex + sizeHex + leverageHex + pnlHex + stringLenHex + stringContentHex;
};

export interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  time: string;
  txHash?: string;
  explorerUrl?: string;
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
  getProvider: () => any;
  claimFaucet: () => void;
  addNotification: (type: 'info' | 'success' | 'warning' | 'error', title: string, message: string, txHash?: string) => void;
  dismissNotification: (id: string) => void;
  placeOrder: (
    side: 'LONG' | 'SHORT',
    type: 'MARKET' | 'LIMIT' | 'STOP',
    price: number,
    amount: number,
    symbolOverride?: string,
    isTpSl?: boolean,
    skipMarginCheck?: boolean
  ) => Promise<void>;
  closePosition: (id: string, closeSize?: number) => Promise<void>;
  cancelOrder: (id: string) => void;
  setTPSL: (symbol: string, tpPrice: number, slPrice: number) => Promise<void>;
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
  const positionsRef = useRef(positions);
  useEffect(() => {
    marketsRef.current = markets;
    activePairRef.current = activePair;
    positionsRef.current = positions;
  }, [markets, activePair, positions]);

  const tickCounter = useRef<number>(0);

  const VAULT_ADDRESS = '0x1b31f6abFA626378096a73727830329BEECE5262';
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
        setMarkets(prev => {
          const newMarkets = prev.map(m => {
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
          // ALSO Mock Execute Limit Orders and TP/SL
          setOpenOrders(prevOrders => {
            const executedOrders: any[] = [];
            const remainingOrders: typeof prevOrders = [];
            
            prevOrders.forEach(order => {
              const currentMarket = newMarkets.find(m => m.symbol === order.symbol);
              if (!currentMarket) {
                remainingOrders.push(order);
                return;
              }
              const markPrice = currentMarket.lastPrice;
              let shouldExecute = false;
              let isTpSlTrigger = false;
              let tpSlPnl = 0;

              if (order.type === 'LIMIT') {
                if (order.side === 'BUY' && markPrice <= order.price) shouldExecute = true;
                if (order.side === 'SELL' && markPrice >= order.price) shouldExecute = true;
              } else if (order.type === 'STOP') {
                if (order.side === 'BUY' && markPrice >= order.price) shouldExecute = true;
                if (order.side === 'SELL' && markPrice <= order.price) shouldExecute = true;
              } else if (order.type === 'TPSL') {
                // If it's TP/SL, check if price crossed TP or SL
                if (order.tpPrice && order.side === 'BUY' && markPrice <= order.tpPrice) { shouldExecute = true; isTpSlTrigger = true; }
                if (order.slPrice && order.side === 'BUY' && markPrice >= order.slPrice) { shouldExecute = true; isTpSlTrigger = true; }
                if (order.tpPrice && order.side === 'SELL' && markPrice >= order.tpPrice) { shouldExecute = true; isTpSlTrigger = true; }
                if (order.slPrice && order.side === 'SELL' && markPrice <= order.slPrice) { shouldExecute = true; isTpSlTrigger = true; }
              }

              if (shouldExecute) {
                executedOrders.push({ ...order, isTpSlTrigger });
              } else {
                remainingOrders.push(order);
              }
            });

            if (executedOrders.length > 0) {
              executedOrders.forEach(order => {
                if (order.isTpSlTrigger) {
                  const posToClose = positionsRef.current.find(p => p.symbol === order.symbol);
                  if (posToClose) {
                    const returnMargin = (posToClose.size * posToClose.entryPrice) / posToClose.leverage;
                    const currentMarket = newMarkets.find(m => m.symbol === order.symbol);
                    const markPrice = currentMarket ? currentMarket.lastPrice : posToClose.markPrice;
                    
                    // Calculate proper PnL for TP/SL using entry price
                    const diff = posToClose.side === 'LONG' ? (markPrice - posToClose.entryPrice) : (posToClose.entryPrice - markPrice);
                    const finalPnl = (diff / posToClose.entryPrice) * (posToClose.size * posToClose.entryPrice);
                    order.tpSlPnl = finalPnl; // Attach PnL to order for history logging

                    const closeFee = (posToClose.size * markPrice) * 0.0006;
                    const netReturn = returnMargin + finalPnl - closeFee;
                    
                    setBalances(prev => ({
                      ...prev,
                      vaultUSDC: prev.vaultUSDC + netReturn
                    }));
                  }
                }
              });

              setPositions(prevPos => {
                let newPos = [...prevPos];
                executedOrders.forEach(order => {
                  if (order.isTpSlTrigger) {
                    newPos = newPos.filter(p => p.symbol !== order.symbol);
                  } else {
                    const currentMarket = newMarkets.find(m => m.symbol === order.symbol);
                    const markPrice = currentMarket ? currentMarket.lastPrice : order.price;
                    const buffer = order.marginMode === 'ISOLATED' ? 0.95 : 0.98;
                    const liqPrice = order.side === 'BUY'
                      ? order.price * (1 - (1 / order.leverage) * buffer)
                      : order.price * (1 + (1 / order.leverage) * buffer);
                    const margin = (order.amount * order.price) / order.leverage;
                    
                    newPos.unshift({
                      id: `pos-${Math.random().toString(36).substring(7)}`,
                      symbol: order.symbol,
                      side: order.side === 'BUY' ? 'LONG' : 'SHORT',
                      size: order.amount,
                      entryPrice: order.price, 
                      markPrice: markPrice,
                      liqPrice: Number(liqPrice.toFixed(getPrecision(order.symbol))),
                      margin: Number(margin.toFixed(2)),
                      leverage: order.leverage,
                      marginMode: order.marginMode,
                      marginRatio: (1 / order.leverage) * 100,
                      unrealizedPnl: 0,
                      tpPrice: order.tpPrice,
                      slPrice: order.slPrice,
                    });
                  }
                });
                return newPos;
              });

              setHistory(prevHist => {
                let newHist = [...prevHist];
                executedOrders.forEach(order => {
                  newHist.unshift({
                    id: `tx-${Math.random().toString(36).substring(7)}`,
                    time: new Date().toISOString().replace('T', ' ').substring(0, 19),
                    pair: order.symbol,
                    side: order.side === 'BUY' ? (order.isTpSlTrigger ? 'SELL' : 'BUY') : (order.isTpSlTrigger ? 'BUY' : 'SELL'),
                    type: order.isTpSlTrigger ? 'TP/SL Triggered' : `${order.type} Filled`,
                    size: `${order.amount} ${order.symbol.split('-')[0]}`,
                    price: `$${(order.isTpSlTrigger ? (newMarkets.find(m => m.symbol === order.symbol)?.lastPrice || 0) : order.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                    fee: `$${((order.amount * (order.price || 1)) * 0.0006).toFixed(2)} USDC`,
                    status: 'FILLED',
                    realizedPnl: order.isTpSlTrigger ? order.tpSlPnl : undefined
                  });
                });
                return newHist;
              });
            }

            return remainingOrders;
          });

          setPositions(prevPos =>
            prevPos.map(pos => {
              const currentMarket = newMarkets.find(m => m.symbol === pos.symbol);
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

          return newMarkets;
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
    txHash?: string,
    explorerUrl?: string
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
      txHash,
      explorerUrl
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
          try {
            await eth.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x4cef52',
                chainName: 'Arc Testnet',
                rpcUrls: ['https://rpc.testnet.arc.network', 'https://rpc.quicknode.testnet.arc.network/'],
                nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 },
                blockExplorerUrls: ['https://testnet.arcscan.app']
              }]
            });
            await eth.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x4cef52' }]
            });
          } catch (e) {
            console.warn("Could not add or switch to Arc Testnet:", e);
          }
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

  const getProvider = () => {
    if (walletType === 'rabby' && (window as any).rabby) {
      return (window as any).rabby;
    }
    return (window as any).ethereum;
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
    amount: number,
    symbolOverride?: string,
    isTpSl?: boolean,
    skipMarginCheck?: boolean
  ) => {
    const orderSymbol = symbolOverride || activePair.symbol;
    if (!walletConnected || !walletAddress) {
      addNotification('error', 'Execution Failed', 'Please connect your wallet to trade on Arc Testnet.');
      return;
    }

    const orderValue = amount * (type === 'MARKET' ? activePair.lastPrice : price);
    const requiredMargin = orderValue / leverage;

    // Process order
    const eth = getProvider();
    if (type === 'MARKET') {
      let txHash = '';

      if (eth && walletAddress) {
        try {
          if (!skipMarginCheck && balances.vaultUSDC < requiredMargin) {
            if (unifiedBalances?.USDC >= requiredMargin) {
              addNotification('info', 'Unified Balance Kit', 'Auto-allocating cross-chain USDC margin...');
              const calldata = encodeOpenPosition(
                activePair.symbol,
                side === 'LONG',
                amount,
                activePair.lastPrice,
                leverage
              );
              txHash = await spend({ 
                amount: requiredMargin, 
                to: VAULT_ADDRESS, 
                chain: "ARC_TESTNET"
              });
            } else {
              addNotification('error', 'Execution Failed', `Insufficient margin. You need at least $${requiredMargin.toFixed(2)} USDC in the Vault to open this position.`);
              return;
            }
          } else {
            addNotification('info', 'Executing Market Order', 'Please confirm the transaction in MetaMask/Rabby...');
            const calldata = encodeOpenPosition(
              activePair.symbol,
              side === 'LONG',
              amount,
              activePair.lastPrice,
              leverage
            );
            
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
          time: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`; })(),
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
      let txHash = '';
      if (eth && walletConnected && walletAddress) {
        addNotification('info', 'Executing Limit Order', 'Please confirm the transaction in MetaMask/Rabby...');
        try {
          const requiredMargin = (amount * price) / leverage;
          if (balances.vaultUSDC < requiredMargin) {
            await spend({ 
              amount: requiredMargin, 
              to: VAULT_ADDRESS, 
              chain: "ARC_TESTNET"
            });
            addNotification('warning', 'Margin Depositing', 'Margin deposit initiated. Please wait 10 seconds for it to confirm, then click Place Order again.');
            return;
          }
          const calldata = encodePlaceLimitOrder(
              activePair.symbol,
              side === 'LONG',
              amount,
              activePair.lastPrice, // entryPrice
              price, // targetPrice
              leverage
            );
            txHash = await eth.request({
              method: 'eth_sendTransaction',
              params: [{ from: walletAddress, to: VAULT_ADDRESS, data: calldata }]
            });
          
          addNotification('success', 'Limit Order Placed', `Transaction sent: ${txHash.slice(0, 10)}...`, txHash);
        } catch (err: any) {
          console.error(err);
          addNotification('error', 'Execution Failed', err.message || 'Transaction rejected.');
          return;
        }
      }

      const newOrder: OpenOrder = {
        id: `ord-${Math.random().toString(36).substring(7)}`,
        symbol: orderSymbol,
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
        `${type} order to ${side === 'LONG' ? 'BUY' : 'SELL'} ${amount} ${orderSymbol} placed at $${price.toFixed(getPrecision(orderSymbol))}.`
      );
      
      if (eth && walletConnected && walletAddress) {
        setTimeout(() => refreshOnChainBalances(walletAddress), 6000);
      }
    }
  };

  const closePosition = async (id: string, closeSize?: number) => {
    const pos = positions.find(p => p.id === id);
    if (!pos) return;

    const eth = getProvider();
    if (!eth || !walletConnected || !walletAddress) {
      addNotification('error', 'Execution Failed', 'Wallet not connected.');
      return;
    }

    const actualCloseSize = (closeSize !== undefined && closeSize > 0 && closeSize < pos.size) ? closeSize : pos.size;
    const isPartial = actualCloseSize < pos.size;
    const fraction = actualCloseSize / pos.size;
    const realizedPnl = pos.unrealizedPnl * fraction;

    addNotification('info', isPartial ? 'Closing Partial Position' : 'Closing Position', 'Please confirm the transaction in MetaMask/Rabby...');
    try {
      // Generate dynamic ABI data for closePosition(string,uint256,uint256,int256)
      const txData = encodeClosePosition(pos.symbol, actualCloseSize, pos.entryPrice, pos.leverage, realizedPnl);

      const txHash = await eth.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: VAULT_ADDRESS,
          data: txData
        }]
      });

      addNotification('success', 'Transaction Submitted', `${isPartial ? 'Partial ' : ''}Close Position sent: ${txHash.slice(0, 10)}...`);

      // Update position locally for immediate responsive UI feedback
      if (isPartial) {
        setPositions(prev => prev.map(p => {
          if (p.id === id) {
            return {
              ...p,
              size: p.size - actualCloseSize,
              margin: p.margin - (p.margin * fraction),
              unrealizedPnl: p.unrealizedPnl - realizedPnl,
            };
          }
          return p;
        }));
      } else {
        setPositions(prev => prev.filter(p => p.id !== id));
      }

      addNotification(
        'success',
        isPartial ? 'Partial Position Closed' : 'Position Closed',
        `Closed ${actualCloseSize} ${pos.symbol} at mark price $${pos.markPrice.toFixed(getPrecision(pos.symbol))}. PnL: $${realizedPnl.toFixed(2)}`
      );

      // Record close in history
      const historyItem: HistoryItem = {
        id: `tx-${Math.random().toString(36).substring(7)}`,
        time: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`; })(),
        pair: pos.symbol,
        side: pos.side === 'LONG' ? 'SELL' : 'BUY',
        type: isPartial ? 'Market (Partial Close)' : 'Market (Close)',
        size: `${actualCloseSize} ${pos.symbol.split('-')[0]}`,
        price: `$${pos.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        fee: `$${((actualCloseSize * pos.markPrice) * 0.0006).toFixed(2)} USDC`,
        status: 'FILLED',
        realizedPnl: realizedPnl
      };
      setHistory(prev => [historyItem, ...prev]);

      // Refresh on-chain balances after transaction propagates
      setTimeout(() => refreshOnChainBalances(walletAddress), 6000);
    } catch (err: any) {
      console.error(err);
      addNotification('error', 'Close Failed', err.message || 'Transaction rejected.');
    }
  };

  const cancelOrder = async (id: string) => {
    const order = openOrders.find(o => o.id === id);
    if (!order) return;

    const eth = getProvider();
    if (eth && walletConnected && walletAddress && order.type !== 'TPSL') {
      addNotification('info', 'Cancelling Order', 'Please confirm the cancel transaction...');
      try {
        const calldata = encodeCancelLimitOrder(order.symbol, order.amount, order.price, order.leverage);
        const txHash = await eth.request({
          method: 'eth_sendTransaction',
          params: [{
            from: walletAddress,
            to: VAULT_ADDRESS,
            data: calldata
          }]
        });
        addNotification('success', 'Transaction Submitted', `Cancel Order sent: ${txHash.slice(0, 10)}...`);
        setTimeout(() => refreshOnChainBalances(walletAddress), 6000);
      } catch (err: any) {
        console.error(err);
        addNotification('error', 'Execution Failed', err.message || 'Transaction rejected.');
        return;
      }
    }

    setOpenOrders(prev => prev.filter(o => o.id !== id));
    addNotification('info', 'Order Cancelled', 'Limit order successfully cancelled.');
  };

  const setTPSL = async (symbol: string, tpPrice: number, slPrice: number) => {
    const eth = getProvider();
    if (eth && walletConnected && walletAddress) {
      addNotification('info', 'Setting TP/SL', 'Please confirm the transaction in MetaMask/Rabby...');
      try {
        const calldata = encodeSetTPSL(symbol, tpPrice, slPrice);
        const txHash = await eth.request({
          method: 'eth_sendTransaction',
          params: [{ from: walletAddress, to: VAULT_ADDRESS, data: calldata }]
        });
        addNotification('success', 'TP/SL Set', `Transaction sent: ${txHash.slice(0, 10)}...`, txHash);
        
        const pos = positions.find(p => p.symbol === symbol);
        if (pos) {
          // If editing, remove the old one first
          setOpenOrders(prev => {
            const filtered = prev.filter(o => !(o.type === 'TPSL' && o.symbol === symbol));
            const newOrder: OpenOrder = {
              id: `ord-${Math.random().toString(36).substring(7)}`,
              symbol,
              side: pos.side === 'LONG' ? 'SELL' : 'BUY',
              type: 'TPSL',
              price: 0,
              tpPrice: tpPrice > 0 ? tpPrice : undefined,
              slPrice: slPrice > 0 ? slPrice : undefined,
              amount: pos.size,
              leverage: pos.leverage,
              marginMode: pos.marginMode,
              status: 'OPEN',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            return [newOrder, ...filtered];
          });
        }
      } catch (err: any) {
        console.error(err);
        addNotification('error', 'Execution Failed', err.message || 'Transaction rejected.');
      }
    }
  };

  const depositFunds = async (amount: number) => {
    const eth = getProvider();
    if (!eth || !walletConnected || !walletAddress) {
      addNotification('error', 'Deposit Failed', 'Wallet not connected.');
      return;
    }
    if (balances.USDC < amount) {
      addNotification('error', 'Insufficient Balance', `You only have ${balances.USDC} USDC available.`);
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
      const currentAllowance = (allowanceRes && allowanceRes !== '0x') ? BigInt(allowanceRes) : BigInt(0);

      if (currentAllowance < rawAmount) {
        addNotification('info', 'Approve USDC', 'Please approve the vault to spend your USDC in MetaMask.');
        const approveData = '0x095ea7b3' + padAddress(VAULT_ADDRESS) + padBigInt(rawAmount);
        const approveTxHash = await eth.request({
          method: 'eth_sendTransaction',
          params: [{
            from: walletAddress,
            to: tokenAddress,
            data: approveData
          }]
        });
        addNotification('info', 'Approval Sent', 'Waiting for approval transaction confirmation...');
        
        let receipt = null;
        while (!receipt) {
          receipt = await eth.request({
            method: 'eth_getTransactionReceipt',
            params: [approveTxHash]
          });
          if (!receipt) await new Promise(r => setTimeout(r, 2000));
        }
        if (receipt.status === '0x0' || receipt.status === 0) {
          throw new Error('Approval transaction failed on-chain.');
        }
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
    const eth = getProvider();
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
        positions: walletConnected ? positions : [],
        openOrders: walletConnected ? openOrders : [],
        history: walletConnected ? history : [],
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
        getProvider,
        claimFaucet,
        addNotification,
        dismissNotification,
        addHistoryItem,
        clearHistory,
        placeOrder,
        closePosition,
        cancelOrder,
        setTPSL,
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
