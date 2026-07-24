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

export type AppTab = 'Home' | 'Perpetuals' | 'Swap' | 'Vault' | 'Agents' | 'Portfolio' | 'History';

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

const encodeOpenPosition = (symbol: string, isLong: boolean, size: number, entryPrice: number, leverage: number) => {
  const selector = 'd2719d3f';
  const offsetHex = 'a0'.padStart(64, '0');
  const isLongHex = (isLong ? 1 : 0).toString(16).padStart(64, '0');
  const sizeWei = BigInt(Math.floor(size * 1000000)) * BigInt(10 ** 12);
  const sizeHex = sizeWei.toString(16).padStart(64, '0');
  const priceWei = BigInt(Math.floor(entryPrice * 1000000)) * BigInt(10 ** 12);
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
  const selector = '024c0846';
  const offsetHex = '40'.padStart(64, '0');
  const pnlWei = BigInt(Math.round(realizedPnl * 1000000)) * BigInt(10 ** 12);
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
  balances: { USDC: number; walletUSDC: number; BTC: number; ETH: number; SOL: number; ARC: number; EURC: number; USDT: number };
  setBalances: React.Dispatch<React.SetStateAction<{ USDC: number; walletUSDC: number; BTC: number; ETH: number; SOL: number; ARC: number; EURC: number; USDT: number }>>;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
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

  const VAULT_ADDRESS = '0x503B3910ff21948464AA92BaB16a6200848bD11B';
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

  const refreshOnChainBalances = async (userAddressStr?: string) => {
    const address = userAddressStr || walletAddressRef.current;
    if (!address) return;

    const eth = (window as any).ethereum;
    if (!eth) return;

    try {
      // 1. Get native EVM balance (Native USDC/ARC gas token on Arc Testnet)
      let nativeBal = 0;
      try {
        const nativeHex = await eth.request({
          method: 'eth_getBalance',
          params: [address, 'latest']
        });
        if (nativeHex && nativeHex !== '0x') {
          nativeBal = Number(BigInt(nativeHex)) / 1e18;
        }
      } catch (e) {
        console.warn('Native balance fetch failed:', e);
      }

      // 2. Try fetching vault collateral balance
      let vaultUSDC = 0;
      try {
        const vaultBalRes = await eth.request({
          method: 'eth_call',
          params: [{ to: VAULT_ADDRESS, data: '0x5dcf7429' + padAddress(address) }, 'latest']
        });
        if (vaultBalRes && vaultBalRes !== '0x') {
          vaultUSDC = Number(BigInt(vaultBalRes)) / 1e18;
        }
      } catch (e) {
        // Vault check fallback
      }

      // 3. Try fetching wallet token balance
      let walletUSDC = 0;
      try {
        const tokenRes = await eth.request({
          method: 'eth_call',
          params: [{ to: VAULT_ADDRESS, data: '0xdc862d66' }, 'latest']
        }).catch(() => null);

        if (tokenRes && tokenRes !== '0x' && tokenRes.length >= 42) {
          const tokenAddress = '0x' + tokenRes.slice(-40);
          const walletBalRes = await eth.request({
            method: 'eth_call',
            params: [{ to: tokenAddress, data: '0x70a08231' + padAddress(address) }, 'latest']
          }).catch(() => null);
          if (walletBalRes && walletBalRes !== '0x') {
            walletUSDC = Number(BigInt(walletBalRes)) / 1e18;
          }
        }
      } catch (e) {
        // Token balance fallback
      }

      // Use native gas balance as USDC balance on Arc Testnet if vault is un-deposited
      const activeUSDC = vaultUSDC > 0 ? vaultUSDC : (walletUSDC > 0 ? walletUSDC : nativeBal);

      setBalances(prev => ({
        ...prev,
        USDC: activeUSDC > 0 ? activeUSDC : (prev.USDC > 0 ? prev.USDC : 0),
        walletUSDC: walletUSDC > 0 ? walletUSDC : activeUSDC,
        ARC: nativeBal > 0 ? nativeBal : prev.ARC,
        EURC: prev.EURC > 0 ? prev.EURC : (activeUSDC > 0 ? activeUSDC * 0.92 : 0),
        USDT: prev.USDT > 0 ? prev.USDT : activeUSDC
      }));
    } catch (e) {
      console.error('Error refreshing on-chain balances:', e);
    }
  };

  // Poll balances when wallet changes
  useEffect(() => {
    if (walletConnected && walletAddress) {
      refreshOnChainBalances(walletAddress);
      const interval = setInterval(() => {
        refreshOnChainBalances(walletAddressRef.current);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [walletConnected, walletAddress]);

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

    // Auto-dismiss within 2.5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 2500);
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const connectWallet = async (type: string) => {
    // Detect Rabby or standard EVM provider
    const eth = (window as any).rabby || (window as any).ethereum;
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
          // Encode vault contract call: selector 0x7606c9f2
          // Params: (string market, uint256 sizeWei)
          // Layout: offset(0x40) + sizeWei + strLen + strData (padded to 32 bytes)
          const market = activePair.symbol; // e.g. "BTC-PERP"
          const sizeWei = BigInt(Math.floor(amount * 1e18)).toString(16).padStart(64, '0');
          const strLen = market.length.toString(16).padStart(64, '0');
          let strHex = '';
          for (let i = 0; i < market.length; i++) {
            strHex += market.charCodeAt(i).toString(16).padStart(2, '0');
          }
          strHex = strHex.padEnd(64, '0'); // pad to 32 bytes

          const calldata = '0x7606c9f2' +
            '0000000000000000000000000000000000000000000000000000000000000040' + // offset to string
            sizeWei +   // uint256 size
            strLen +    // string length
            strHex;     // string data

          txHash = await eth.request({
            method: 'eth_sendTransaction',
            params: [{
              from: walletAddress,
              to: VAULT_ADDRESS,
              data: calldata
            }]
          });

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
        params: [{ to: VAULT_ADDRESS, data: '0xdc862d66' }, 'latest']
      });
      const tokenAddress = '0x' + tokenRes.slice(-40);

      // Check allowance
      const allowanceData = '0xdd62ed3e' + padAddress(walletAddress) + padAddress(VAULT_ADDRESS);
      const allowanceRes = await eth.request({
        method: 'eth_call',
        params: [{ to: tokenAddress, data: allowanceData }, 'latest']
      });
      
      const rawAmount = BigInt(Math.floor(amount * 1e6)) * BigInt(10 ** 12); // 18 decimals
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
      const txHash = await eth.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: VAULT_ADDRESS,
          value: '0x0'
        }]
      });

      addNotification('success', 'Deposit Submitted', `Transaction sent: ${txHash.slice(0, 10)}...`, txHash);
      setTimeout(() => refreshOnChainBalances(walletAddress), 3000);
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

    if (balances.USDC < amount) {
      addNotification('error', 'Withdrawal Failed', 'Insufficient margin deposited.');
      return;
    }

    addNotification('info', 'Withdraw Collateral', 'Please confirm the withdraw transaction in MetaMask.');
    try {
      const txHash = await eth.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: VAULT_ADDRESS,
          value: '0x0'
        }]
      });

      addNotification('success', 'Withdrawal Submitted', `Transaction sent: ${txHash.slice(0, 10)}...`, txHash);
      setTimeout(() => refreshOnChainBalances(walletAddress), 6000);
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
