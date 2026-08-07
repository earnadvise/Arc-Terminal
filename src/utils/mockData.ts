export interface Market {
  symbol: string;
  name: string;
  category: 'Crypto' | 'Commodities' | 'Forex';
  lastPrice: number;
  prevPrice: number;
  change24h: number;
  volume24h: number;
  openInterest: number;
  fundingRate: number;
  nextFundingTime: number; // timestamp
  high24h: number;
  low24h: number;
}

export interface Candlestick {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number; // size in token
  entryPrice: number;
  markPrice: number;
  liqPrice: number;
  margin: number;
  leverage: number;
  unrealizedPnl: number;
  marginMode: 'CROSS' | 'ISOLATED';
}

export interface OpenOrder {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP' | 'TPSL';
  price: number;
  tpPrice?: number;
  slPrice?: number;
  amount: number;
  leverage: number;
  marginMode: 'CROSS' | 'ISOLATED';
  status: 'OPEN' | 'PARTIAL';
  time: string;
}

export interface HistoryItem {
  id: string;
  time: string;
  timestamp?: number;
  pair: string;
  side: string;
  type: string;
  size: string;
  price: string;
  fee: string;
  status: 'COMPLETED' | 'CANCELLED' | 'FILLED' | 'SUCCESS' | 'FAILED' | 'PENDING';
  category?: 'Swap' | 'Vault' | 'Perpetuals';
  txHash?: string;
  details?: string;
  realizedPnl?: number;
}

export interface LeaderboardTrader {
  rank: number;
  wallet: string;
  pnl: number;
  roi: number;
  volume: number;
  winRate: number;
  badge: 'Gold' | 'Silver' | 'Bronze' | 'Pioneer' | 'Whale' | 'None';
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  points: number;
  progress: number; // 0 to 100
  completed: boolean;
  category: 'Daily' | 'Weekly' | 'Season';
}

// Initial markets list matching Tower Exchange styles
export const initialMarkets: Market[] = [
  {
    symbol: 'BTC-PERP',
    name: 'Bitcoin',
    category: 'Crypto',
    lastPrice: 64144.00,
    prevPrice: 63280.00,
    change24h: 1.36,
    volume24h: 12450800000,
    openInterest: 824500000,
    fundingRate: 0.0001, // 0.01%
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 65120.00,
    low24h: 63800.00
  },
  {
    symbol: 'ETH-PERP',
    name: 'Ethereum',
    category: 'Crypto',
    lastPrice: 3482.40,
    prevPrice: 3525.00,
    change24h: -1.21,
    volume24h: 5820450000,
    openInterest: 412700000,
    fundingRate: -0.00005, // -0.005%
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 3550.00,
    low24h: 3410.00
  },
  {
    symbol: 'SOL-PERP',
    name: 'Solana',
    category: 'Crypto',
    lastPrice: 146.85,
    prevPrice: 139.00,
    change24h: 5.65,
    volume24h: 2150900000,
    openInterest: 188400000,
    fundingRate: 0.00025, // 0.025%
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 149.20,
    low24h: 138.10
  },
  {
    symbol: 'ARC-PERP',
    name: 'Arc Native',
    category: 'Crypto',
    lastPrice: 1.2450,
    prevPrice: 1.1070,
    change24h: 12.46,
    volume24h: 450120000,
    openInterest: 45800000,
    fundingRate: 0.0005, // 0.05%
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 1.2890,
    low24h: 1.0950
  },
  {
    symbol: 'SUI-PERP',
    name: 'Sui',
    category: 'Crypto',
    lastPrice: 1.8420,
    prevPrice: 1.9010,
    change24h: -3.10,
    volume24h: 320400000,
    openInterest: 28900000,
    fundingRate: -0.00012,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 1.9210,
    low24h: 1.8200
  },
  {
    symbol: 'APT-PERP',
    name: 'Aptos',
    category: 'Crypto',
    lastPrice: 8.9450,
    prevPrice: 8.8740,
    change24h: 0.80,
    volume24h: 180200000,
    openInterest: 15400000,
    fundingRate: 0.00008,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 9.1500,
    low24h: 8.8200
  },
  {
    symbol: 'xau-PERP',
    name: 'Gold',
    category: 'Commodities',
    lastPrice: 2322.80,
    prevPrice: 2319.30,
    change24h: 0.15,
    volume24h: 950800000,
    openInterest: 120400000,
    fundingRate: 0.00002,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 2335.00,
    low24h: 2315.40
  },
  {
    symbol: 'xag-PERP',
    name: 'Silver',
    category: 'Commodities',
    lastPrice: 29.125,
    prevPrice: 29.315,
    change24h: -0.65,
    volume24h: 240400000,
    openInterest: 32900000,
    fundingRate: 0.00001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 29.580,
    low24h: 28.950
  },
  {
    symbol: 'eur-PERP',
    name: 'Euro',
    category: 'Forex',
    lastPrice: 1.08525,
    prevPrice: 1.08470,
    change24h: 0.05,
    volume24h: 1250100000,
    openInterest: 145000000,
    fundingRate: 0.000005,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 1.08720,
    low24h: 1.08310
  },
  {
    symbol: 'gbp-PERP',
    name: 'British Pound',
    category: 'Forex',
    lastPrice: 1.27395,
    prevPrice: 1.27550,
    change24h: -0.12,
    volume24h: 850300000,
    openInterest: 94800000,
    fundingRate: 0.000008,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 1.27850,
    low24h: 1.27120
  },
  {
    symbol: 'jpy-PERP',
    name: 'Japanese Yen',
    category: 'Forex',
    lastPrice: 160.25,
    prevPrice: 160.00,
    change24h: 0.15,
    volume24h: 1540900000,
    openInterest: 198200000,
    fundingRate: -0.000015,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 160.40,
    low24h: 159.90
  }
];

// Generates high quality candlesticks for the charts
export function generateCandlesticks(
  lastPrice: number,
  count: number = 100,
  timeframe: string = '1h'
): Candlestick[] {
  const data: Candlestick[] = [];
  let currentPrice = lastPrice - (count * (lastPrice * 0.001)); // start lower
  let currentTime = new Date();
  
  const stepMinutes = timeframe === '1m' ? 1 :
                      timeframe === '5m' ? 5 :
                      timeframe === '15m' ? 15 :
                      timeframe === '1h' ? 60 :
                      timeframe === '4h' ? 240 : 1440;

  currentTime.setMinutes(currentTime.getMinutes() - count * stepMinutes);

  for (let i = 0; i < count; i++) {
    const volatility = lastPrice * 0.003;
    const change = (Math.random() - 0.48) * volatility; // slightly positive bias
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * (volatility * 0.5);
    const low = Math.min(open, close) - Math.random() * (volatility * 0.5);
    const volume = Math.round(10000 + Math.random() * 90000 * (lastPrice < 10 ? 1000 : 1));

    data.push({
      time: currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      open: Number(open.toFixed(6)),
      high: Number(high.toFixed(6)),
      low: Number(low.toFixed(6)),
      close: Number(close.toFixed(6)),
      volume
    });

    currentPrice = close;
    currentTime.setMinutes(currentTime.getMinutes() + stepMinutes);
  }

  return data;
}

export const initialMissions: Mission[] = [
  {
    id: 'm1',
    title: 'Arc Terminal Onboarding',
    description: 'Connect your wallet to Arc Testnet',
    points: 100,
    progress: 0,
    completed: false,
    category: 'Daily'
  },
  {
    id: 'm2',
    title: 'Faucet Claim',
    description: 'Claim free testnet funds from the faucet',
    points: 150,
    progress: 0,
    completed: false,
    category: 'Daily'
  },
  {
    id: 'm3',
    title: 'First Perpetual Trade',
    description: 'Open any leverage position (Long or Short) on Arc Terminal',
    points: 250,
    progress: 0,
    completed: false,
    category: 'Daily'
  },
  {
    id: 'm4',
    title: 'Leverage Explorer',
    description: 'Execute a trade with >= 25x leverage',
    points: 400,
    progress: 0,
    completed: false,
    category: 'Weekly'
  },
  {
    id: 'm5',
    title: 'Volume Milestone I',
    description: 'Accumulate $10,000 in total trading volume',
    points: 500,
    progress: 0,
    completed: false,
    category: 'Weekly'
  },
  {
    id: 'm6',
    title: 'Arc Testnet Master',
    description: 'Place 10 limit orders and 10 market orders',
    points: 1000,
    progress: 0,
    completed: false,
    category: 'Season'
  },
  {
    id: 'm7',
    title: 'PnL Champion',
    description: 'Realize over $1,500 in profits from a single trade',
    points: 1200,
    progress: 0,
    completed: false,
    category: 'Season'
  }
];

export const initialLeaderboard: LeaderboardTrader[] = [
  { rank: 1, wallet: '0x3f9d...21b4', pnl: 45290.80, roi: 345.8, volume: 14850000, winRate: 78.4, badge: 'Gold' },
  { rank: 2, wallet: '0x8e2a...f952', pnl: 28410.50, roi: 194.2, volume: 8520000, winRate: 69.1, badge: 'Silver' },
  { rank: 3, wallet: '0x1b4c...e829', pnl: 21950.20, roi: 158.6, volume: 6410000, winRate: 72.8, badge: 'Bronze' },
  { rank: 4, wallet: '0xf8e1...4a2b', pnl: 18450.00, roi: 122.4, volume: 11200000, winRate: 61.2, badge: 'Whale' },
  { rank: 5, wallet: '0x7d6f...991c', pnl: 12390.40, roi: 94.7, volume: 4210000, winRate: 68.5, badge: 'Pioneer' },
  { rank: 6, wallet: '0x5c3b...12a0', pnl: 9480.10, roi: 82.1, volume: 3150000, winRate: 59.7, badge: 'None' },
  { rank: 7, wallet: '0x9d4e...a7e8', pnl: 7120.30, roi: 71.3, volume: 2900000, winRate: 64.2, badge: 'None' },
  { rank: 8, wallet: '0x2c6f...b83d', pnl: 4890.00, roi: 49.5, volume: 1850000, winRate: 55.4, badge: 'None' },
  { rank: 9, wallet: '0xe1a8...5d2f', pnl: 3420.50, roi: 38.2, volume: 1200000, winRate: 52.1, badge: 'None' },
  { rank: 10, wallet: '0x6b9d...f0e1', pnl: 1940.80, roi: 24.5, volume: 940000, winRate: 48.9, badge: 'None' }
];

export const initialHistory: HistoryItem[] = [];
