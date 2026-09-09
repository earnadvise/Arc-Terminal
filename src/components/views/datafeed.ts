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
    const { from, to, firstDataRequest } = periodParams;
    const symbol = symbolInfo.name; // e.g., "SOLUSDT"
    const interval = intervalMap[resolution] || '1h';
    
    try {
      // If it's a mock or Hyperliquid symbol, we might need a different API. 
      // For now, we route everything to Binance (except HYPE/LITER which will fail gracefully)
      if (symbol === 'HYPE' || symbol === 'LITER') {
         onHistoryCallback([], { noData: true });
         return;
      }
      
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${from * 1000}&endTime=${to * 1000}&limit=1000`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data || data.length === 0) {
        onHistoryCallback([], { noData: true });
        return;
      }
      
      const bars = data.map((el: any) => ({
        time: el[0], // timestamp in ms
        open: parseFloat(el[1]),
        high: parseFloat(el[2]),
        low: parseFloat(el[3]),
        close: parseFloat(el[4]),
        volume: parseFloat(el[5]),
      }));
      
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
