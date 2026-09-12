// Basic custom datafeed for Binance
const configurationData = {
  supported_resolutions: ['1', '5', '15', '60', '240', '1D'],
  exchanges: [{ value: 'Binance', name: 'Binance', desc: 'Binance' }],
  symbols_types: [{ name: 'crypto', value: 'crypto' }],
};

const intervalMap: Record<string, string> = {
  '1': '1m',
  '5': '5m',
  '15': '15m',
  '60': '1h',
  '240': '4h',
  '1D': '1d',
};

export default {
  onReady: (callback: Function) => {
    setTimeout(() => callback(configurationData));
  },
  
  searchSymbols: () => {},
  
  resolveSymbol: async (
    symbolName: string,
    onSymbolResolvedCallback: Function,
    onResolveErrorCallback: Function
  ) => {
    // symbolName usually comes in as "Binance:SOLUSDT" or just "SOLUSDT"
    const parsedSymbol = symbolName.includes(':') ? symbolName.split(':')[1] : symbolName;
    
    const symbolInfo = {
      name: parsedSymbol,
      description: parsedSymbol,
      type: 'crypto',
      session: '24x7',
      timezone: 'Etc/UTC',
      exchange: 'Binance',
      minmov: 1,
      pricescale: 10000,
      has_intraday: true,
      has_daily: true,
      has_weekly_and_monthly: false,
      supported_resolutions: configurationData.supported_resolutions,
      volume_precision: 2,
      data_status: 'streaming',
    };
    
    // Adjust pricescale for specific pairs (e.g., SOL doesn't need 10000, but it's safe for now)
    setTimeout(() => onSymbolResolvedCallback(symbolInfo), 0);
  },
  
  getBars: async (
    symbolInfo: any,
    resolution: string,
    periodParams: any,
    onHistoryCallback: Function,
    onErrorCallback: Function
  ) => {
    const { from, to } = periodParams;
    const symbol = symbolInfo.name; // e.g., "SOLUSDT" or "HYPEUSDT"
    const interval = intervalMap[resolution] || '1h';
    
    try {
      if (symbol === 'Mock:LITER' || symbol === 'LITER') {
         // Generate fake mock candlesticks for LITER since it doesn't exist on any exchange
         let bars = [];
         let currentTime = from * 1000;
         while (currentTime <= to * 1000) {
            bars.push({
               time: currentTime,
               open: 4.65 + (Math.random() * 0.02 - 0.01),
               high: 4.66 + (Math.random() * 0.02),
               low: 4.64 - (Math.random() * 0.02),
               close: 4.65 + (Math.random() * 0.02 - 0.01),
               volume: Math.random() * 1000 + 500
            });
            // increment by 1 hour (3600000 ms) as a generic step
            currentTime += 3600000;
         }
         onHistoryCallback(bars, { noData: false });
         return;
      }

      if (!symbol.endsWith('USDT')) {
         onHistoryCallback([], { noData: true });
         return;
      }

      let bars = [];

      if (symbol === 'HYPEUSDT') {
         // Use Hyperliquid API for HYPE
         const hlIntervalMap: Record<string, string> = {
            '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1h', '4h': '4h', '1d': '1d'
         };
         
         const payload = {
            type: "candleSnapshot",
            req: {
               coin: "HYPE",
               interval: hlIntervalMap[interval] || '1h',
               startTime: from * 1000,
               endTime: to * 1000
            }
         };

         const response = await fetch("https://api.hyperliquid.xyz/info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
         });
         
         const data = await response.json();
         if (!data || data.length === 0) {
            onHistoryCallback([], { noData: true });
            return;
         }
         
         bars = data.map((el: any) => ({
            time: el.t,
            open: parseFloat(el.o),
            high: parseFloat(el.h),
            low: parseFloat(el.l),
            close: parseFloat(el.c),
            volume: parseFloat(el.v)
         }));

      } else {
         // Use Binance API for all other crypto
         const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${from * 1000}&endTime=${to * 1000}&limit=1000`;
         const response = await fetch(url);
         const data = await response.json();
         
         if (!data || data.length === 0) {
            onHistoryCallback([], { noData: true });
            return;
         }
         
         bars = data.map((el: any) => ({
            time: el[0], 
            open: parseFloat(el[1]),
            high: parseFloat(el[2]),
            low: parseFloat(el[3]),
            close: parseFloat(el[4]),
            volume: parseFloat(el[5]),
         }));
      }
      
      onHistoryCallback(bars, { noData: false });
    } catch (error) {
      console.log('[getBars]: Get error', error);
      onErrorCallback(error);
    }
  },
  
  subscribeBars: (
    symbolInfo: any,
    resolution: string,
    onRealtimeCallback: Function,
    subscribeUID: string,
    onResetCacheNeededCallback: Function
  ) => {
    // WebSockets implementation will go here for live ticking
  },
  
  unsubscribeBars: (subscriberUID: string) => {
    // Unsubscribe logic
  },
};
