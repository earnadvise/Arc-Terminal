import { useState } from 'react';

// Extended market IDs on Arc — matches their API market names
const EXTENDED_MARKETS: Record<string, string> = {
  BTC:  'BTC-USD-PERP',
  ETH:  'ETH-USD-PERP',
  SOL:  'SOL-USD-PERP',
  ARB:  'ARB-USD-PERP',
  AAPL: 'AAPL-USD-PERP',
  TSLA: 'TSLA-USD-PERP',
  GOLD: 'GOLD-USD-PERP',
  OIL:  'OIL-USD-PERP',
};

export interface ExtendedOrderResult {
  success: boolean;
  message: string;
  orderId?: string;
}

export function useExtended() {
  const [isProcessing, setIsProcessing] = useState(false);

  const placeExtendedOrder = async (
    symbol:      string,
    isLong:      boolean,
    sizeUsd:     number,
    limitPx:     number,
    orderType:   'MARKET' | 'LIMIT' = 'MARKET',
  ): Promise<ExtendedOrderResult> => {
    setIsProcessing(true);
    try {
      const coin = symbol.split(/[-/]/)[0].toUpperCase();
      const market = EXTENDED_MARKETS[coin] ?? `${coin}-USD-PERP`;

      const payload = {
        market,
        side:      isLong ? 'BUY' : 'SELL',
        type:      orderType,
        size:      sizeUsd.toFixed(2),
        price:     orderType === 'LIMIT' ? limitPx.toFixed(2) : undefined,
        timeInForce: orderType === 'MARKET' ? 'IOC' : 'GTC',
        reduceOnly: false,
      };

      const res = await fetch('/api/extended/order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      const data = await res.json();
      console.log('[Extended order result]', JSON.stringify(data));

      if (data.status === 'ok') {
        const inner = data.response;
        // Extended returns { status: 'OK', data: { orderId, ... } }
        if (inner?.status === 'OK' || inner?.data?.orderId) {
          return {
            success: true,
            message: `${isLong ? 'Long' : 'Short'} order placed on Extended for ${coin}`,
            orderId: inner?.data?.orderId,
          };
        }
        // Handle error response from Extended
        const errMsg = inner?.error?.message ?? inner?.message ?? JSON.stringify(inner);
        return { success: false, message: errMsg };
      }

      return { success: false, message: data.response ?? 'Order failed' };

    } catch (error: any) {
      console.error('[Extended order error]', error);
      return { success: false, message: error?.message ?? 'Order execution failed' };
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelExtendedOrder = async (orderId: string): Promise<ExtendedOrderResult> => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/extended/order?id=${orderId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'ok') return { success: true, message: 'Order cancelled' };
      return { success: false, message: data.response ?? 'Cancel failed' };
    } catch (error: any) {
      return { success: false, message: error?.message ?? 'Cancel failed' };
    } finally {
      setIsProcessing(false);
    }
  };

  return { isProcessing, placeExtendedOrder, cancelExtendedOrder };
}
