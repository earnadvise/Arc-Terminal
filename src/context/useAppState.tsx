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

export type AppTab = 'Home' | 'Perpetuals' | 'Swap' | 'Bridge' | 'Buy' | 'SafePay' | 'Agents' | 'History' | 'Portfolio' | 'Earn';

const getPrecision = (symbol: string): number => {
  const s = symbol.toLowerCase();
  if (s.startsWith('eur') || s.startsWith('gbp') || s.startsWith('sui') || s.startsWith('apt')) return 4;
  if (s.startsWith('xag')) return 3;
  return 2;
};

const encodeAddMargin = (symbol: string, amount: number) => {
  const selector = '02b91811';
  const offsetHex = '40'.padStart(64, '0');
  const amountWei = BigInt(Math.floor(amount * 1e6));
  const amountHex = amountWei.toString(16).padStart(64, '0');
  const stringBytes = Array.from(symbol).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  const stringLenHex = symbol.length.toString(16).padStart(64, '0');
  const stringContentHex = stringBytes.padEnd(64, '0');
  return '0x' + selector + offsetHex + amountHex + stringLenHex + stringContentHex;
};

const encodeOpenPosition = (symbol: string, isLong: boolean, amount: number, entryPrice: number, leverage: number) => {
  const selector = '67491bd2';
  const offsetHex = 'a0'.padStart(64, '0');
  const isLongHex = (isLong ? 1 : 0).toString(16).padStart(64, '0');
  const positionSize = amount * entryPrice;
  const sizeWei = BigInt(Math.floor(positionSize * 1e6));
  const sizeHex = sizeWei.toString(16).padStart(64, '0');
  const priceWei = BigInt(Math.floor(entryPrice * 1e6));
  const priceHex = priceWei.toString(16).padStart(64, '0');
  const leverageHex = Math.floor(leverage).toString(16).padStart(64, '0');
  const stringLenHex = symbol.length.toString(16).padStart(64, '0');
  let stringBytes = '';
  for (let i = 0; i < symbol.length; i++) stringBytes += symbol.charCodeAt(i).toString(16);
  const stringContentHex = stringBytes.padEnd(64, '0');
  return '0x' + selector + offsetHex + isLongHex + sizeHex + priceHex + leverageHex + stringLenHex + stringContentHex;
};

const encodePlaceLimitOrder = (symbol: string, isLong: boolean, size: number, targetPrice: number, leverage: number) => {
  const selector = '28d8681f';
  const offsetHex = 'a0'.padStart(64, '0');
  const isLongHex = (isLong ? 1 : 0).toString(16).padStart(64, '0');
  const positionSize = size * targetPrice;
  const sizeWei = BigInt(Math.floor(positionSize * 1e6));
  const sizeHex = sizeWei.toString(16).padStart(64, '0');
  const priceWei = BigInt(Math.floor(targetPrice * 1e6));
  const priceHex = priceWei.toString(16).padStart(64, '0');
  const leverageHex = Math.floor(leverage).toString(16).padStart(64, '0');
  const stringLenHex = symbol.length.toString(16).padStart(64, '0');
  let stringBytes = '';
  for (let i = 0; i < symbol.length; i++) stringBytes += symbol.charCodeAt(i).toString(16);
  const stringContentHex = stringBytes.padEnd(64, '0');
  return '0x' + selector + offsetHex + isLongHex + sizeHex + priceHex + leverageHex + stringLenHex + stringContentHex;
};

const encodeSetTPSL = (symbol: string, takeProfit: number, stopLoss: number) => {
  const selector = '2a71bbc3';
  const offsetHex = '60'.padStart(64, '0');
  const tpWei = BigInt(Math.floor(takeProfit * 1e6));
  const tpHex = tpWei.toString(16).padStart(64, '0');
  const slWei = BigInt(Math.floor(stopLoss * 1e6));
  const slHex = slWei.toString(16).padStart(64, '0');
  const stringLenHex = symbol.length.toString(16).padStart(64, '0');
  let stringBytes = '';
  for (let i = 0; i < symbol.length; i++) stringBytes += symbol.charCodeAt(i).toString(16);
  const stringContentHex = stringBytes.padEnd(64, '0');
  return '0x' + selector + offsetHex + tpHex + slHex + stringLenHex + stringContentHex;
};

const encodeCancelLimitOrder = (symbol: string, size: number, entryPrice: number, leverage: number) => {
  const selector = '66be0122';
  const offsetHex = '60'.padStart(64, '0');
  const positionSize = size * entryPrice;
  const sizeWei = BigInt(Math.floor(positionSize * 1e6));
  const sizeHex = sizeWei.toString(16).padStart(64, '0');
  const leverageHex = Math.floor(leverage).toString(16).padStart(64, '0');
  const stringLenHex = symbol.length.toString(16).padStart(64, '0');
  let stringBytes = '';
  for (let i = 0; i < symbol.length; i++) stringBytes += symbol.charCodeAt(i).toString(16);
  const stringContentHex = stringBytes.padEnd(64, '0');
  return '0x' + selector + offsetHex + sizeHex + leverageHex + stringLenHex + stringContentHex;
};

const encodeClosePosition = (symbol: string, size: number, entryPrice: number, leverage: number, realizedPnl: number) => {
  const selector = '3943dbfb';
  const offsetHex = '80'.padStart(64, '0');
  const positionSize = size * entryPrice;
  const sizeWei = BigInt(Math.floor(positionSize * 1e6));
  const sizeHex = sizeWei.toString(16).padStart(64, '0');
  const leverageHex = Math.floor(leverage).toString(16).padStart(64, '0');
  const pnlWei = BigInt(Math.round(realizedPnl * 1e6));
  const pnlHex = (pnlWei < BigInt(0) ? (BigInt(1) << BigInt(256)) + pnlWei : pnlWei).toString(16).padStart(64, '0');
  const stringLenHex = symbol.length.toString(16).padStart(64, '0');
  let stringBytes = '';
  for (let i = 0; i < symbol.length; i++) stringBytes += symbol.charCodeAt(i).toString(16);
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
  balances: { USDC: number; walletUSDC: number; marginUSDC: number; BTC: number; ETH: number; SOL: number; ARC: number; EURC: number; USDT: number };
  setBalances: React.Dispatch<React.SetStateAction<{ USDC: number; walletUSDC: number; marginUSDC: number; BTC: number; ETH: number; SOL: number; ARC: number; EURC: number; USDT: number }>>;
  notifications: AppNotification[];
  timeframe: string;
  setTimeframe: (time: string) => void;
  candleData: Candlestick[];
  leverage: number;
  setLeverage: (lev: number) => void;
  marginMode: 'CROSS' | 'ISOLATED';
  setMarginMode: (mode: 'CROSS' | 'ISOLATED') => void;
  connectWallet: (type: string) => Promise<void>;
  disconnectWallet: () => void;
  getProvider: () => any;
  claimFaucet: () => void;
  addNotification: (type: 'info' | 'success' | 'warning' | 'error', title: string, message: string, txHash?: string) => void;
  dismissNotification: (id: string) => void;
  placeOrder: (side: 'LONG' | 'SHORT', type: 'MARKET' | 'LIMIT' | 'STOP', price: number, amount: number, symbolOverride?: string, isTpSl?: boolean, skipMarginCheck?: boolean) => Promise<void>;
  closePosition: (id: string, closeSize?: number) => Promise<void>;
  adjustPositionMargin: (id: string, additionalMargin: number) => void;
  cancelOrder: (id: string) => void;
  setTPSL: (symbol: string, tpPrice: number, slPrice: number) => Promise<void>;
  depositFunds: (amount: number) => Promise<void>;
  withdrawFunds: (amount: number) => Promise<void>;
  addHistoryItem: (item: Omit<HistoryItem, 'id' | 'time'>) => void;
  clearHistory: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isDarkMode) { document.documentElement.classList.add('dark'); document.documentElement.style.backgroundColor = '#0c0c10'; }
      else { document.documentElement.classList.remove('dark'); document.documentElement.style.backgroundColor = '#ffffff'; }
    }
  }, [isDarkMode]);

  const { balances: unifiedBalances, spend } = useUnifiedBalance();

  const [activeTab, setActiveTab] = useState<AppTab>('Home');
  const [markets, setMarkets] = useState<Market[]>(initialMarkets);
  const [activePairSymbol, setActivePairSymbol] = useState<string>('BTC-PERP');
  const [timeframe, setTimeframe] = useState<string>('1h');
  const [leverageState, setLeverageState] = useState<number>(10);
  const setLeverage = (lev: number) => setLeverageState(Math.min(20, Math.max(1, lev)));
  const leverage = leverageState;
  const [marginMode, setMarginMode] = useState<'CROSS' | 'ISOLATED'>('CROSS');
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [walletType, setWalletType] = useState<string>('');
  const [balances, setBalances] = useState({ USDC: 0, walletUSDC: 0, marginUSDC: 0, BTC: 0, ETH: 0, SOL: 0, ARC: 0, EURC: 0, USDT: 0 });
  const walletAddressRef = useRef(walletAddress);
  useEffect(() => { walletAddressRef.current = walletAddress; }, [walletAddress]);

  const [positions, setPositions] = useState<Position[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && walletAddress) {
      try {
        const savedPos = localStorage.getItem(`arc_terminal_positions_${walletAddress}`);
        if (savedPos) { try { const p = JSON.parse(savedPos); setPositions(Array.isArray(p) ? p.filter(x => x && !isNaN(x.size) && !isNaN(x.margin)) : []); } catch { setPositions([]); } } else setPositions([]);
        const savedOrders = localStorage.getItem(`arc_terminal_orders_${walletAddress}`);
        if (savedOrders) setOpenOrders(JSON.parse(savedOrders)); else setOpenOrders([]);
        const savedHist = localStorage.getItem(`arc_terminal_history_${walletAddress}`);
        if (savedHist) setHistory(JSON.parse(savedHist)); else setHistory([]);
        const savedMargin = localStorage.getItem(`arc_terminal_Margin_${walletAddress}`);
        if (savedMargin) { const m = Number(savedMargin); if (!isNaN(m) && m >= 0 && m < 10000000) setBalances(prev => ({ ...prev, marginUSDC: m })); else localStorage.removeItem(`arc_terminal_Margin_${walletAddress}`); }
      } catch {}
      setIsDataLoaded(true);
    } else { setPositions([]); setOpenOrders([]); setHistory([]); setIsDataLoaded(false); }
  }, [walletAddress]);

  useEffect(() => { if (walletAddress && isDataLoaded) localStorage.setItem(`arc_terminal_positions_${walletAddress}`, JSON.stringify(positions)); }, [positions, walletAddress]);
  useEffect(() => { if (walletAddress && isDataLoaded) localStorage.setItem(`arc_terminal_orders_${walletAddress}`, JSON.stringify(openOrders)); }, [openOrders, walletAddress]);
  useEffect(() => { if (walletAddress && isDataLoaded) localStorage.setItem(`arc_terminal_history_${walletAddress}`, JSON.stringify(history)); }, [history, walletAddress, isDataLoaded]);
  useEffect(() => { if (walletAddress && isDataLoaded) localStorage.setItem(`arc_terminal_Margin_${walletAddress}`, balances.marginUSDC.toString()); }, [balances.marginUSDC, walletAddress, isDataLoaded]);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [candleData, setCandleData] = useState<Candlestick[]>([]);
  const activePair = markets.find(m => m.symbol === activePairSymbol) || markets[0];

  useEffect(() => { setCandleData(generateCandlesticks(activePair.lastPrice, 80, timeframe)); }, [activePairSymbol, timeframe]);

  const marketsRef = useRef(markets);
  const activePairRef = useRef(activePair);
  const positionsRef = useRef(positions);
  useEffect(() => { marketsRef.current = markets; activePairRef.current = activePair; positionsRef.current = positions; }, [markets, activePair, positions]);

  const tickCounter = useRef<number>(0);

  const MARGIN_ADDRESS = '0x68E6EF57B846CA3dBb3Aed6E8e7512BB2180C8C7';
  const ARC_USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
  const NATIVE_DECIMALS = 18;
  const USDC_DECIMALS_LOCAL = 6;

  const padAddress = (addr: string) => addr.toLowerCase().replace('0x', '').padStart(64, '0');
  const padBigInt = (val: bigint) => val.toString(16).padStart(64, '0');

  const parseHex = (hex: string | null | undefined, decimals: number, fallback: number): number => {
    if (!hex || hex === '0x' || hex === '0x0' || (hex as any)?.error) return fallback;
    try { return Number(BigInt(hex)) / (10 ** decimals); } catch { return fallback; }
  };

  const refreshOnChainBalances = async (address: string) => {
    if (!address) return;
    try {
      const rpcUrl = 'https://rpc.mainnet.arc.io';
      const req = (method: string, params: any[]) =>
        fetch(rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }) }).then(r => r.json()).catch(() => null);
      const bal = (to: string) => req('eth_call', [{ to, data: '0x70a08231' + padAddress(address) }, 'latest']);
      const [nativeRes, walletUsdcRes, eurcRes, cirBtcRes, marginRes] = await Promise.all([
        req('eth_getBalance', [address, 'latest']),
        bal(ARC_USDC_ADDRESS),
        bal('0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1'),
        bal('0x171A4217b86A807A64eB94757Db6849fb4bDbAA0'),
        req('eth_call', [{ to: MARGIN_ADDRESS, data: '0x3b663195' + padAddress(address) }, 'latest']),
      ]);
      setBalances(prev => ({
        USDC:       parseHex(walletUsdcRes?.result, USDC_DECIMALS_LOCAL, prev.walletUSDC),
        walletUSDC: parseHex(walletUsdcRes?.result, USDC_DECIMALS_LOCAL, prev.walletUSDC),
        marginUSDC: parseHex(marginRes?.result,     USDC_DECIMALS_LOCAL, prev.marginUSDC),
        BTC:        parseHex(cirBtcRes?.result,     8,                   prev.BTC),
        ETH:        0,
        SOL:        0,
        ARC:        parseHex(nativeRes?.result,     NATIVE_DECIMALS,     prev.ARC),
        EURC:       parseHex(eurcRes?.result,       USDC_DECIMALS_LOCAL, prev.EURC),
        USDT:       0,
      }));
    } catch (e) { console.error('Error refreshing on-chain balances:', e); }
  };

  useEffect(() => {
    let active = true;
    const poll = async () => {
      if (!active || !walletConnected || !walletAddressRef.current) return;
      await refreshOnChainBalances(walletAddressRef.current);
      if (active) setTimeout(poll, 2500);
    };
    if (walletConnected && walletAddress) poll();
    return () => { active = false; };
  }, [walletConnected, walletAddress]);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const hlRes = await fetch('https://api.hyperliquid.xyz/info', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: "metaAndAssetCtxs" }) }).catch(() => null);
        let apiData: Record<string, any> = {};
        if (hlRes && hlRes.ok) {
          const data = await hlRes.json();
          const meta = data[0]; const ctxs = data[1];
          meta.universe.forEach((coin: any, index: number) => {
            const symbol = coin.name + '-PERP'; const ctx = ctxs[index];
            if (ctx) {
              const markPx = parseFloat(ctx.markPx); const prevDayPx = parseFloat(ctx.prevDayPx);
              const change24h = prevDayPx > 0 ? ((markPx - prevDayPx) / prevDayPx) * 100 : 0;
              apiData[symbol] = { lastPrice: markPx, change24h: Number(change24h.toFixed(2)), high24h: 0, low24h: 0, volume24h: Math.round(parseFloat(ctx.dayNtlVlm)) };
            }
          });
          if (apiData['BTC-PERP']) apiData['ARC-PERP'] = { ...apiData['BTC-PERP'] };
        } else {
          const res = await fetch('/api/prices');
          if (!res.ok) throw new Error('API request failed');
          apiData = await res.json();
        }
        setMarkets(prev => prev.map(m => { const d = apiData[m.symbol]; if (!d) return m; return { ...m, lastPrice: d.lastPrice, change24h: d.change24h, high24h: d.high24h, low24h: d.low24h, volume24h: d.volume24h }; }));
        setPositions(prevPos => prevPos.map(pos => { const d = apiData[pos.symbol]; if (!d) return pos; const diff = pos.side === 'LONG' ? (d.lastPrice - pos.entryPrice) : (pos.entryPrice - d.lastPrice); return { ...pos, markPrice: d.lastPrice, unrealizedPnl: Number((diff * pos.size).toFixed(2)) }; }));
        setOpenOrders(prevOrders => {
          const executed: any[] = []; const remaining: typeof prevOrders = [];
          prevOrders.forEach(order => {
            const m = apiData[order.symbol]; if (!m) { remaining.push(order); return; }
            const px = m.lastPrice; let exec = false; let tpsl = false;
            if (order.type === 'LIMIT') { if (order.side === 'BUY' && px <= order.price) exec = true; if (order.side === 'SELL' && px >= order.price) exec = true; }
            else if (order.type === 'STOP') { if (order.side === 'BUY' && px >= order.price) exec = true; if (order.side === 'SELL' && px <= order.price) exec = true; }
            else if (order.type === 'TPSL') {
              if (order.tpPrice && order.side === 'BUY' && px <= order.tpPrice) { exec = true; tpsl = true; }
              if (order.slPrice && order.side === 'BUY' && px >= order.slPrice) { exec = true; tpsl = true; }
              if (order.tpPrice && order.side === 'SELL' && px >= order.tpPrice) { exec = true; tpsl = true; }
              if (order.slPrice && order.side === 'SELL' && px <= order.slPrice) { exec = true; tpsl = true; }
            }
            if (exec) executed.push({ ...order, isTpSlTrigger: tpsl }); else remaining.push(order);
          });
          if (executed.length > 0) {
            setPositions(prevPos => {
              let newPos = [...prevPos];
              executed.forEach(order => {
                if (order.isTpSlTrigger) { newPos = newPos.filter(p => p.symbol !== order.symbol); }
                else {
                  const mkt = apiData[order.symbol]; const mp = mkt ? mkt.lastPrice : order.price;
                  const side = order.side === 'BUY' ? 'LONG' : 'SHORT';
                  const margin = (order.amount * order.price) / order.leverage;
                  const idx = newPos.findIndex(p => p.symbol === order.symbol && p.side === side);
                  if (idx !== -1) {
                    const ep = newPos[idx]; const ns = ep.size + order.amount; const nm = ep.margin + margin;
                    const ne = ((ep.size * ep.entryPrice) + (order.amount * order.price)) / ns;
                    const nl = (ns * ne) / nm; const buf = ep.marginMode === 'ISOLATED' ? 0.95 : 0.98;
                    const lq = side === 'LONG' ? ne * (1 - (1/nl)*buf) : ne * (1 + (1/nl)*buf);
                    newPos[idx] = { ...ep, size: Number(ns.toFixed(6)), margin: Number(nm.toFixed(2)), entryPrice: Number(ne.toFixed(2)), markPrice: mp, leverage: Number(nl.toFixed(2)), liqPrice: Number(lq.toFixed(2)) };
                  } else {
                    const buf = order.marginMode === 'ISOLATED' ? 0.95 : 0.98;
                    const lq = side === 'LONG' ? order.price*(1-(1/order.leverage)*buf) : order.price*(1+(1/order.leverage)*buf);
                    newPos.unshift({ id: 'pos-'+Math.random().toString(36).substring(7), symbol: order.symbol, side, size: order.amount, entryPrice: order.price, markPrice: mp, liqPrice: Number(lq.toFixed(2)), margin: Number(margin.toFixed(2)), leverage: order.leverage, marginMode: order.marginMode, unrealizedPnl: 0 });
                  }
                }
              });
              return newPos;
            });
          }
          return remaining;
        });
      } catch {
        let fp: Record<string, number> = {};
        setMarkets(prev => prev.map(m => { const c = (Math.random()-0.49)*0.0015; const p = Number((m.lastPrice+(m.lastPrice*c)).toFixed(4)); fp[m.symbol]=p; return {...m,lastPrice:p}; }));
        setPositions(prev => prev.map(p => { const np = fp[p.symbol]; if (!np) return p; const d = p.side==='LONG'?(np-p.entryPrice):(p.entryPrice-np); return {...p,markPrice:np,unrealizedPnl:Number((d*p.size).toFixed(2))}; }));
      }
      setCandleData(prev => prev.length === 0 ? prev : [...prev]);
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 1000);
    return () => clearInterval(interval);
  }, [activePairSymbol]);

  const addNotification = (type: 'info'|'success'|'warning'|'error', title: string, message: string, txHash?: string, explorerUrl?: string) => {
    if (type === 'error' && (message.toLowerCase().includes('connect') || title.toLowerCase().includes('wallet'))) return;
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [{ id, type, title, message, time: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}), txHash, explorerUrl }, ...prev].slice(0, 5));
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 6000);
  };

  const dismissNotification = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

  const addHistoryItem = (item: Omit<HistoryItem, 'id' | 'time'>) => {
    const now = new Date();
    const newItem: HistoryItem = { id: 'tx-'+Date.now()+'-'+Math.random().toString(36).substring(7), time: now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}), timestamp: Date.now(), ...item };
    setHistory(prev => { const updated = [newItem, ...prev].slice(0, 100); try { localStorage.setItem('arc_terminal_user_history', JSON.stringify(updated)); } catch {} return updated; });
  };

  const clearHistory = () => { setHistory([]); try { localStorage.removeItem('arc_terminal_user_history'); } catch {} };

  const connectWallet = async (type: string) => {
    let eth = (type.toLowerCase() === 'rabby' && (window as any).rabby) ? (window as any).rabby : (window as any).ethereum;
    if (eth) {
      try {
        const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          try {
            await eth.request({ method: 'wallet_addEthereumChain', params: [{ chainId: '0x13b2', chainName: 'Arc Mainnet', rpcUrls: ['https://rpc.mainnet.arc.io'], nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 }, blockExplorerUrls: ['https://explorer.arc.io'] }] });
            await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x13b2' }] });
          } catch (e) { console.warn('Could not switch to Arc Mainnet:', e); }
          const fullAddr = accounts[0];
          setWalletConnected(true); setWalletAddress(fullAddr); setWalletType(type);
          refreshOnChainBalances(fullAddr);
          addNotification('success', 'Wallet Connected', `Connected ${type} (${fullAddr.slice(0,6)}...${fullAddr.slice(-4)}) on Arc Mainnet.`);
          return;
        }
      } catch (err) { console.error('Wallet connection failed:', err); return; }
    }
    addNotification('error', 'No Wallet Found', `No ${type} detected.`);
  };

  const getProvider = () => (walletType === 'rabby' && (window as any).rabby) ? (window as any).rabby : (window as any).ethereum;

  const disconnectWallet = () => {
    addNotification('info', 'Wallet Disconnected', 'Disconnected wallet.');
    setWalletConnected(false); setWalletAddress(''); setWalletType('');
    setBalances({ USDC:0, walletUSDC:0, marginUSDC:0, BTC:0, ETH:0, SOL:0, ARC:0, EURC:0, USDT:0 });
  };

  const claimFaucet = () => { if (typeof window !== 'undefined') window.open('https://faucet.circle.com/', '_blank'); addNotification('info', 'Circle Faucet', 'Opened faucet.circle.com to request USDC.'); };

  const placeOrder = async (side: 'LONG'|'SHORT', type: 'MARKET'|'LIMIT'|'STOP', price: number, amount: number, symbolOverride?: string, isTpSl?: boolean, skipMarginCheck?: boolean) => {
    const orderSymbol = symbolOverride || activePair.symbol;
    if (!walletConnected || !walletAddress) { addNotification('error', 'Execution Failed', 'Please connect your wallet.'); return; }
    const orderValue = amount * (type === 'MARKET' ? activePair.lastPrice : price);
    const requiredMargin = orderValue / leverage;
    const eth = getProvider();
    if (type === 'MARKET') {
      let txHash = '';
      if (eth && walletAddress) {
        try {
          if (!skipMarginCheck && balances.marginUSDC < requiredMargin) {
            if (unifiedBalances?.USDC >= requiredMargin) {
              addNotification('info', 'Unified Balance Kit', 'Auto-allocating cross-chain USDC margin...');
              txHash = await spend({ amount: requiredMargin, to: MARGIN_ADDRESS, chain: "Arc_Mainnet" });
            } else { addNotification('error', 'Execution Failed', `Insufficient margin. Need $${requiredMargin.toFixed(2)} USDC.`); return; }
          } else {
            addNotification('info', 'Executing Market Order', 'Please confirm in MetaMask/Rabby...');
            const calldata = encodeOpenPosition(activePair.symbol, side === 'LONG', amount, activePair.lastPrice, leverage);
            txHash = await eth.request({ method: 'eth_sendTransaction', params: [{ from: walletAddress, to: MARGIN_ADDRESS, data: calldata }] });
          }
          addNotification('success', 'Transaction Submitted', `Open Position sent: ${txHash.slice(0,10)}...`, txHash);
          setBalances(prev => ({ ...prev, marginUSDC: prev.marginUSDC - requiredMargin }));
        } catch (err: any) { console.error(err); addNotification('error', 'Execution Failed', err.message || 'Transaction rejected.'); return; }
      } else {
        txHash = '0x' + Array.from({length:64},()=>Math.floor(Math.random()*16).toString(16)).join('');
        addNotification('success', 'Order Submitted', 'Market order submitted.', txHash);
      }
      const entryPrice = activePair.lastPrice;
      setPositions(prev => {
        const idx = prev.findIndex(p => p.symbol === activePair.symbol && p.side === side);
        if (idx !== -1) {
          const ep = prev[idx]; const ns = ep.size+amount; const nm = ep.margin+requiredMargin;
          const ne = ((ep.size*ep.entryPrice)+(amount*entryPrice))/ns; const nl = (ns*ne)/nm;
          const buf = ep.marginMode==='ISOLATED'?0.95:0.98;
          const lq = side==='LONG'?ne*(1-(1/nl)*buf):ne*(1+(1/nl)*buf);
          const np = [...prev]; np[idx]={...ep,size:Number(ns.toFixed(6)),margin:Number(nm.toFixed(2)),entryPrice:Number(ne.toFixed(2)),markPrice:entryPrice,leverage:Number(nl.toFixed(2)),liqPrice:Number(lq.toFixed(getPrecision(activePair.symbol)))}; return np;
        }
        const buf = marginMode==='ISOLATED'?0.95:0.98;
        const lq = side==='LONG'?entryPrice*(1-(1/leverage)*buf):entryPrice*(1+(1/leverage)*buf);
        return [{ id:`pos-${Math.random().toString(36).substring(7)}`,symbol:activePair.symbol,side,size:amount,entryPrice,markPrice:entryPrice,liqPrice:Number(lq.toFixed(getPrecision(activePair.symbol))),margin:Number(requiredMargin.toFixed(2)),leverage,unrealizedPnl:0,marginMode }, ...prev];
      });
      const now = new Date();
      setHistory(prev => [{ id:`tx-${Math.random().toString(36).substring(7)}`, time:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`, pair:activePair.symbol, side:side==='LONG'?'LONG':'SHORT', type:'Market', size:`${amount} ${activePair.symbol.split('-')[0]}`, price:`$${entryPrice.toLocaleString(undefined,{minimumFractionDigits:2})}`, fee:`$${(orderValue*0.0006).toFixed(2)} USDC`, status:'FILLED' }, ...prev]);
      setTimeout(() => refreshOnChainBalances(walletAddress), 6000);
    } else {
      let txHash = '';
      if (eth && walletConnected && walletAddress && !skipMarginCheck) {
        addNotification('info', 'Executing Limit Order', 'Please confirm in MetaMask/Rabby...');
        try {
          const rm = (amount * price) / leverage;
          if (balances.marginUSDC < rm) { await spend({ amount: rm, to: MARGIN_ADDRESS, chain: "Arc_Mainnet" }); addNotification('warning', 'Margin Depositing', 'Wait 10s then click Place Order again.'); return; }
          const calldata = encodePlaceLimitOrder(activePair.symbol, side==='LONG', amount, price, leverage);
          txHash = await eth.request({ method: 'eth_sendTransaction', params: [{ from: walletAddress, to: MARGIN_ADDRESS, data: calldata }] });
          addNotification('success', 'Limit Order Placed', `Transaction sent: ${txHash.slice(0,10)}...`, txHash);
          setBalances(prev => ({ ...prev, marginUSDC: prev.marginUSDC - rm }));
        } catch (err: any) { console.error(err); addNotification('error', 'Execution Failed', err.message || 'Transaction rejected.'); return; }
      }
      setOpenOrders(prev => [{ id:`ord-${Math.random().toString(36).substring(7)}`,symbol:orderSymbol,side:side==='LONG'?'BUY':'SELL',type,price,amount,leverage,marginMode,status:'OPEN',time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) }, ...prev]);
      addNotification('info', 'Order Placed', `${type} order to ${side==='LONG'?'BUY':'SELL'} ${amount} ${orderSymbol} at $${price.toFixed(getPrecision(orderSymbol))}.`);
      if (eth && walletConnected && walletAddress) setTimeout(() => refreshOnChainBalances(walletAddress), 6000);
    }
  };

  const closePosition = async (id: string, closeSize?: number) => {
    const pos = positions.find(p => p.id === id);
    if (!pos) return;
    const eth = getProvider();
    if (!eth || !walletConnected || !walletAddress) { addNotification('error', 'Execution Failed', 'Wallet not connected.'); return; }
    const actualCloseSize = (closeSize !== undefined && closeSize > 0 && closeSize < pos.size) ? closeSize : pos.size;
    const isPartial = actualCloseSize < pos.size;
    const fraction = actualCloseSize / pos.size;
    const realizedPnl = pos.unrealizedPnl * fraction;
    window.dispatchEvent(new CustomEvent('mock_pnl_settled', { detail: realizedPnl }));
    addNotification('info', isPartial ? 'Closing Partial Position' : 'Closing Position', 'Please confirm in MetaMask/Rabby...');
    try {
      const txData = encodeClosePosition(pos.symbol, actualCloseSize, pos.entryPrice, pos.leverage, realizedPnl);
      const txHash = await eth.request({ method: 'eth_sendTransaction', params: [{ from: walletAddress, to: MARGIN_ADDRESS, data: txData }] });
      addNotification('success', 'Transaction Submitted', `${isPartial?'Partial ':''}Close sent: ${txHash.slice(0,10)}...`);
      const returnMargin = pos.margin * fraction;
      const closeFee = (actualCloseSize * pos.markPrice) * 0.0006;
      const netReturn = returnMargin + realizedPnl - closeFee;
      setBalances(prev => ({ ...prev, marginUSDC: prev.marginUSDC + netReturn }));
      if (isPartial) {
        setPositions(prev => prev.map(p => p.id !== id ? p : { ...p, size: Number((p.size-actualCloseSize).toFixed(6)), margin: Number((p.margin-(p.margin*fraction)).toFixed(2)), unrealizedPnl: Number((p.unrealizedPnl-realizedPnl).toFixed(2)) }));
      } else {
        setPositions(prev => prev.filter(p => p.id !== id));
        setOpenOrders(prev => prev.filter(o => !(o.type === 'TPSL' && o.symbol === pos.symbol)));
      }
      addNotification('success', isPartial ? 'Partial Position Closed' : 'Position Closed', `Closed ${actualCloseSize} ${pos.symbol} at $${pos.markPrice.toFixed(getPrecision(pos.symbol))}. PnL: $${realizedPnl.toFixed(2)}`);
      const now = new Date();
      setHistory(prev => [{ id:`tx-${Math.random().toString(36).substring(7)}`, time:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`, pair:pos.symbol, side:pos.side==='LONG'?'SELL':'BUY', type:isPartial?'Market (Partial Close)':'Market (Close)', size:`${actualCloseSize} ${pos.symbol.split('-')[0]}`, price:`$${pos.markPrice.toLocaleString(undefined,{minimumFractionDigits:2})}`, fee:`$${((actualCloseSize*pos.markPrice)*0.0006).toFixed(2)} USDC`, status:'FILLED', realizedPnl }, ...prev]);
      // Poll on-chain at 1s, 3s, 6s so settled PnL reflects in margin balance quickly
      setTimeout(() => refreshOnChainBalances(walletAddress), 1000);
      setTimeout(() => refreshOnChainBalances(walletAddress), 3000);
      setTimeout(() => refreshOnChainBalances(walletAddress), 6000);
    } catch (err: any) { console.error(err); addNotification('error', 'Close Failed', err.message || 'Transaction rejected.'); }
  };

  const adjustPositionMargin = async (id: string, additionalMargin: number) => {
    const pos = positions.find(p => p.id === id);
    if (!pos) return;
    const eth = getProvider();
    if (eth && walletConnected && walletAddress && !skipMarginCheck) {
      if (balances.marginUSDC < additionalMargin) {
        if (unifiedBalances?.USDC >= additionalMargin) {
          addNotification('info', 'Unified Balance Kit', 'Auto-allocating cross-chain USDC margin...');
          try { await spend({ amount: additionalMargin, to: walletAddress, chain: "Arc_Mainnet" }); } catch (err: any) { addNotification('error', 'Execution Failed', err.message || 'Transaction rejected.'); return; }
        } else { addNotification('error', 'Execution Failed', `Insufficient margin. Need $${additionalMargin.toFixed(2)} USDC.`); return; }
      } else {
        addNotification('info', 'Adjusting Margin', 'Please confirm in MetaMask/Rabby...');
        try {
          const txHash = await eth.request({ method: 'eth_sendTransaction', params: [{ from: walletAddress, to: MARGIN_ADDRESS, data: encodeAddMargin(pos.symbol, additionalMargin) }] });
          addNotification('success', 'Transaction Submitted', `Margin adjustment sent: ${txHash.slice(0,10)}...`, txHash);
        } catch (err: any) { addNotification('error', 'Execution Failed', err.message || 'Transaction rejected.'); return; }
      }
    } else { addNotification('error', 'Execution Failed', 'Please connect your wallet.'); return; }
    setBalances(prev => ({ ...prev, marginUSDC: prev.marginUSDC - additionalMargin }));
    setPositions(prev => prev.map(p => {
      if (p.id !== id) return p;
      const nm = p.margin + additionalMargin; const nl = (p.size * p.entryPrice) / nm;
      const buf = p.marginMode === 'ISOLATED' ? 0.95 : 0.98;
      const lq = p.side === 'LONG' ? p.entryPrice*(1-(1/nl)*buf) : p.entryPrice*(1+(1/nl)*buf);
      return { ...p, margin: Number(nm.toFixed(2)), leverage: Number(nl.toFixed(2)), liqPrice: Number(lq.toFixed(getPrecision(p.symbol))) };
    }));
    setTimeout(() => refreshOnChainBalances(walletAddress), 6000);
  };

  const cancelOrder = async (id: string) => {
    const order = openOrders.find(o => o.id === id);
    if (!order) return;
    const eth = getProvider();
    if (eth && walletConnected && walletAddress && order.type !== 'TPSL') {
      addNotification('info', 'Cancelling Order', 'Please confirm the cancel transaction...');
      try {
        const txHash = await eth.request({ method: 'eth_sendTransaction', params: [{ from: walletAddress, to: MARGIN_ADDRESS, data: encodeCancelLimitOrder(order.symbol, order.amount, order.price, order.leverage) }] });
        addNotification('success', 'Transaction Submitted', `Cancel Order sent: ${txHash.slice(0,10)}...`);
        setBalances(prev => ({ ...prev, marginUSDC: prev.marginUSDC + (order.amount * order.price) / order.leverage }));
        setTimeout(() => refreshOnChainBalances(walletAddress), 6000);
      } catch (err: any) { addNotification('error', 'Execution Failed', err.message || 'Transaction rejected.'); return; }
    }
    setOpenOrders(prev => prev.filter(o => o.id !== id));
    addNotification('info', 'Order Cancelled', 'Limit order successfully cancelled.');
  };

  const setTPSL = async (symbol: string, tpPrice: number, slPrice: number) => {
    const eth = getProvider();
    if (eth && walletConnected && walletAddress && !skipMarginCheck) {
      addNotification('info', 'Setting TP/SL', 'Please confirm in MetaMask/Rabby...');
      try {
        const txHash = await eth.request({ method: 'eth_sendTransaction', params: [{ from: walletAddress, to: MARGIN_ADDRESS, data: encodeSetTPSL(symbol, tpPrice, slPrice) }] });
        addNotification('success', 'TP/SL Set', `Transaction sent: ${txHash.slice(0,10)}...`, txHash);
        const pos = positions.find(p => p.symbol === symbol);
        if (pos) {
          setOpenOrders(prev => {
            const filtered = prev.filter(o => !(o.type === 'TPSL' && o.symbol === symbol));
            return [{ id:`ord-${Math.random().toString(36).substring(7)}`, symbol, side:pos.side==='LONG'?'SELL':'BUY', type:'TPSL', price:0, tpPrice:tpPrice>0?tpPrice:undefined, slPrice:slPrice>0?slPrice:undefined, amount:pos.size, leverage:pos.leverage, marginMode:pos.marginMode, status:'OPEN', time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) }, ...filtered];
          });
        }
      } catch (err: any) { addNotification('error', 'Execution Failed', err.message || 'Transaction rejected.'); }
    }
  };

  const depositFunds = async (amount: number) => {
    const eth = getProvider();
    if (!eth || !walletConnected || !walletAddress) { addNotification('error', 'Deposit Failed', 'Wallet not connected.'); return; }
    if (balances.USDC < amount) { addNotification('error', 'Insufficient Balance', `You only have $${balances.USDC.toFixed(2)} USDC available.`); return; }
    addNotification('info', 'Deposit Collateral', 'Preparing deposit...');
    try {
      const amountWei = BigInt(Math.floor(amount * 1e6));
      const amountHex = amountWei.toString(16).padStart(64, '0');
      const allowanceData = '0xdd62ed3e' + padAddress(walletAddress) + padAddress(MARGIN_ADDRESS);
      const allowanceRes = await fetch('https://rpc.mainnet.arc.io', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_call',params:[{to:ARC_USDC_ADDRESS,data:allowanceData},'latest']}) }).then(r=>r.json()).catch(()=>null);
      const currentAllowance = allowanceRes?.result && allowanceRes.result !== '0x' ? BigInt(allowanceRes.result) : BigInt(0);
      if (currentAllowance < amountWei) {
        addNotification('info', 'Approve USDC', 'Please approve USDC spending...');
        await eth.request({ method: 'eth_sendTransaction', params: [{ from: walletAddress, to: ARC_USDC_ADDRESS, data: '0x095ea7b3' + padAddress(MARGIN_ADDRESS) + amountHex }] });
      }
      addNotification('info', 'Deposit Collateral', 'Please confirm the deposit transaction...');
      const txHash = await eth.request({ method: 'eth_sendTransaction', params: [{ from: walletAddress, to: MARGIN_ADDRESS, data: '0xb6b55f25' + amountHex }] });
      setBalances(prev => ({ ...prev, marginUSDC: prev.marginUSDC + amount, walletUSDC: Math.max(0, prev.walletUSDC - amount) }));
      addNotification('success', 'Deposit Submitted', `Deposited $${amount.toFixed(2)} to margin!`, txHash);
      setTimeout(() => refreshOnChainBalances(walletAddress), 2000);
      setTimeout(() => refreshOnChainBalances(walletAddress), 5000);
    } catch (err: any) { addNotification('error', 'Deposit Failed', err.message || 'Transaction rejected.'); }
  };

  const withdrawFunds = async (amount: number) => {
    const eth = getProvider();
    if (!eth || !walletConnected || !walletAddress) { addNotification('error', 'Withdrawal Failed', 'Wallet not connected.'); return; }
    if (balances.marginUSDC < amount) { addNotification('error', 'Withdrawal Failed', 'Insufficient margin balance.'); return; }
    addNotification('info', 'Withdraw Collateral', 'Please confirm the withdraw transaction in MetaMask.');
    try {
      const amountHex = BigInt(Math.floor(amount * 1e6)).toString(16).padStart(64, '0');
      const txHash = await eth.request({ method: 'eth_sendTransaction', params: [{ from: walletAddress, to: MARGIN_ADDRESS, data: '0x2e1a7d4d' + amountHex }] });
      setBalances(prev => ({ ...prev, marginUSDC: prev.marginUSDC - amount, walletUSDC: prev.walletUSDC + amount }));
      addNotification('success', 'Withdrawal Submitted', `Transaction sent: ${txHash.slice(0,10)}...`, txHash);
      refreshOnChainBalances(walletAddress);
      setTimeout(() => refreshOnChainBalances(walletAddress), 1000);
      setTimeout(() => refreshOnChainBalances(walletAddress), 2500);
      setTimeout(() => refreshOnChainBalances(walletAddress), 5000);
    } catch (err: any) { addNotification('error', 'Withdrawal Failed', err.message || 'Transaction rejected.'); }
  };

  const setActivePairBySymbol = (symbol: string) => setActivePairSymbol(symbol);

  return (
    <AppContext.Provider value={{ activeTab, setActiveTab, markets, activePair, setActivePairBySymbol, positions: walletConnected ? positions : [], openOrders: walletConnected ? openOrders : [], history: walletConnected ? history : [], walletConnected, walletAddress, walletType, balances, setBalances, notifications, timeframe, setTimeframe, candleData, leverage, setLeverage, marginMode, setMarginMode, connectWallet, disconnectWallet, getProvider, claimFaucet, addNotification, dismissNotification, addHistoryItem, clearHistory, isDarkMode, toggleDarkMode, placeOrder, closePosition, cancelOrder, setTPSL, depositFunds, withdrawFunds, adjustPositionMargin }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppState must be used within an AppStateProvider');
  return context;
}
