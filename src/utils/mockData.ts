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
  },
  {
    symbol: 'XRP-PERP',
    name: 'XRP Token',
    category: 'Crypto',
    lastPrice: 0.4204,
    prevPrice: 0.4279672,
    change24h: -1.8,
    volume24h: 255611176,
    openInterest: 2983512,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 0.44142000000000003,
    low24h: 0.39937999999999996
  },
  {
    symbol: 'ADA-PERP',
    name: 'ADA Token',
    category: 'Crypto',
    lastPrice: 0.7223,
    prevPrice: 0.76787713,
    change24h: -6.31,
    volume24h: 394733172,
    openInterest: 16861988,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 0.7584150000000001,
    low24h: 0.686185
  },
  {
    symbol: 'AVAX-PERP',
    name: 'AVAX Token',
    category: 'Crypto',
    lastPrice: 66.2758,
    prevPrice: 64.1218365,
    change24h: 3.25,
    volume24h: 352239344,
    openInterest: 25911447,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 69.58959,
    low24h: 62.96201
  },
  {
    symbol: 'DOT-PERP',
    name: 'DOT Token',
    category: 'Crypto',
    lastPrice: 93.4589,
    prevPrice: 94.90751295000001,
    change24h: -1.55,
    volume24h: 339720510,
    openInterest: 19864345,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 98.131845,
    low24h: 88.785955
  },
  {
    symbol: 'LINK-PERP',
    name: 'LINK Token',
    category: 'Crypto',
    lastPrice: 1.4821,
    prevPrice: 1.2869074299999999,
    change24h: 13.17,
    volume24h: 474776586,
    openInterest: 21144342,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 1.556205,
    low24h: 1.4079949999999999
  },
  {
    symbol: 'MATIC-PERP',
    name: 'MATIC Token',
    category: 'Crypto',
    lastPrice: 0.4752,
    prevPrice: 0.4105728,
    change24h: 13.6,
    volume24h: 454182688,
    openInterest: 11917844,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 0.49896,
    low24h: 0.45144
  },
  {
    symbol: 'DOGE-PERP',
    name: 'DOGE Token',
    category: 'Crypto',
    lastPrice: 0.09181,
    prevPrice: 0.096602482,
    change24h: -5.22,
    volume24h: 472720822,
    openInterest: 2327293,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 0.0964005,
    low24h: 0.0872195
  },
  {
    symbol: 'SHIB-PERP',
    name: 'SHIB Token',
    category: 'Crypto',
    lastPrice: 0.012698,
    prevPrice: 0.012628161,
    change24h: 0.55,
    volume24h: 364677571,
    openInterest: 20840085,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 0.0133329,
    low24h: 0.012063099999999998
  },
  {
    symbol: 'UNI-PERP',
    name: 'UNI Token',
    category: 'Crypto',
    lastPrice: 5.1193,
    prevPrice: 4.6990054699999995,
    change24h: 8.21,
    volume24h: 383995020,
    openInterest: 3789358,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 5.375265000000001,
    low24h: 4.863334999999999
  },
  {
    symbol: 'LTC-PERP',
    name: 'LTC Token',
    category: 'Crypto',
    lastPrice: 12.3218,
    prevPrice: 12.86642356,
    change24h: -4.42,
    volume24h: 76871499,
    openInterest: 9899543,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 12.93789,
    low24h: 11.70571
  },
  {
    symbol: 'ATOM-PERP',
    name: 'ATOM Token',
    category: 'Crypto',
    lastPrice: 83.7386,
    prevPrice: 80.89986146,
    change24h: 3.39,
    volume24h: 273239010,
    openInterest: 14946490,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 87.92553000000001,
    low24h: 79.55167
  },
  {
    symbol: 'NEAR-PERP',
    name: 'NEAR Token',
    category: 'Crypto',
    lastPrice: 14.432,
    prevPrice: 13.629580800000001,
    change24h: 5.56,
    volume24h: 204585738,
    openInterest: 18665353,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 15.1536,
    low24h: 13.7104
  },
  {
    symbol: 'TIA-PERP',
    name: 'TIA Token',
    category: 'Crypto',
    lastPrice: 90.1738,
    prevPrice: 79.99317798,
    change24h: 11.29,
    volume24h: 109760137,
    openInterest: 10003934,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 94.68249,
    low24h: 85.66511
  },
  {
    symbol: 'ARB-PERP',
    name: 'ARB Token',
    category: 'Crypto',
    lastPrice: 0.9099,
    prevPrice: 0.82027485,
    change24h: 9.85,
    volume24h: 128916528,
    openInterest: 18357078,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 0.9553950000000001,
    low24h: 0.864405
  },
  {
    symbol: 'OP-PERP',
    name: 'OP Token',
    category: 'Crypto',
    lastPrice: 15.4078,
    prevPrice: 15.925502080000001,
    change24h: -3.36,
    volume24h: 113796731,
    openInterest: 46346527,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 16.17819,
    low24h: 14.63741
  },
  {
    symbol: 'INJ-PERP',
    name: 'INJ Token',
    category: 'Crypto',
    lastPrice: 51.6445,
    prevPrice: 56.18405155000001,
    change24h: -8.79,
    volume24h: 409232742,
    openInterest: 3643938,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 54.226725,
    low24h: 49.062275
  },
  {
    symbol: 'RNDR-PERP',
    name: 'RNDR Token',
    category: 'Crypto',
    lastPrice: 90.1258,
    prevPrice: 81.8792893,
    change24h: 9.15,
    volume24h: 379774132,
    openInterest: 13892300,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 94.63209,
    low24h: 85.61950999999999
  },
  {
    symbol: 'WLD-PERP',
    name: 'WLD Token',
    category: 'Crypto',
    lastPrice: 30.4995,
    prevPrice: 30.606248250000004,
    change24h: -0.35,
    volume24h: 121388214,
    openInterest: 28744311,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 32.024475,
    low24h: 28.974525
  },
  {
    symbol: 'SEI-PERP',
    name: 'SEI Token',
    category: 'Crypto',
    lastPrice: 51.7963,
    prevPrice: 49.04073684,
    change24h: 5.32,
    volume24h: 240530852,
    openInterest: 24536921,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 54.386115000000004,
    low24h: 49.206485
  },
  {
    symbol: 'PEPE-PERP',
    name: 'PEPE Token',
    category: 'Crypto',
    lastPrice: 0.179397,
    prevPrice: 0.1662292602,
    change24h: 7.34,
    volume24h: 471279192,
    openInterest: 34231535,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 0.18836685,
    low24h: 0.17042715
  },
  {
    symbol: 'BONK-PERP',
    name: 'BONK Token',
    category: 'Crypto',
    lastPrice: 0.143901,
    prevPrice: 0.1360008351,
    change24h: 5.49,
    volume24h: 453540515,
    openInterest: 46155711,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 0.15109605,
    low24h: 0.13670595
  },
  {
    symbol: 'WIF-PERP',
    name: 'WIF Token',
    category: 'Crypto',
    lastPrice: 0.362629,
    prevPrice: 0.34921172699999997,
    change24h: 3.7,
    volume24h: 209792527,
    openInterest: 18537593,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 0.38076045,
    low24h: 0.34449755
  },
  {
    symbol: 'JUP-PERP',
    name: 'JUP Token',
    category: 'Crypto',
    lastPrice: 90.173,
    prevPrice: 98.5500717,
    change24h: -9.29,
    volume24h: 195106344,
    openInterest: 24376643,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 94.68165,
    low24h: 85.66435
  },
  {
    symbol: 'PYTH-PERP',
    name: 'PYTH Token',
    category: 'Crypto',
    lastPrice: 80.2869,
    prevPrice: 73.96029228,
    change24h: 7.88,
    volume24h: 75000960,
    openInterest: 37566107,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 84.30124500000001,
    low24h: 76.272555
  },
  {
    symbol: 'ORDI-PERP',
    name: 'ORDI Token',
    category: 'Crypto',
    lastPrice: 20.1314,
    prevPrice: 20.95880054,
    change24h: -4.11,
    volume24h: 440657273,
    openInterest: 43910304,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 21.13797,
    low24h: 19.12483
  },
  {
    symbol: 'SATS-PERP',
    name: 'SATS Token',
    category: 'Crypto',
    lastPrice: 62.7383,
    prevPrice: 64.73337794000001,
    change24h: -3.18,
    volume24h: 465420717,
    openInterest: 4209446,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 65.87521500000001,
    low24h: 59.601385
  },
  {
    symbol: 'FET-PERP',
    name: 'FET Token',
    category: 'Crypto',
    lastPrice: 86.3805,
    prevPrice: 77.1550626,
    change24h: 10.68,
    volume24h: 353922786,
    openInterest: 8195591,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 90.69952500000001,
    low24h: 82.06147499999999
  },
  {
    symbol: 'AGIX-PERP',
    name: 'AGIX Token',
    category: 'Crypto',
    lastPrice: 85.2773,
    prevPrice: 86.74406956,
    change24h: -1.72,
    volume24h: 415470328,
    openInterest: 12374338,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 89.541165,
    low24h: 81.01343499999999
  },
  {
    symbol: 'OCEAN-PERP',
    name: 'OCEAN Token',
    category: 'Crypto',
    lastPrice: 0.3017,
    prevPrice: 0.31397919,
    change24h: -4.07,
    volume24h: 488790225,
    openInterest: 29567431,
    fundingRate: 0.0001,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    high24h: 0.31678500000000004,
    low24h: 0.286615
  },
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
