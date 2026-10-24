import { useState, useCallback } from 'react';
import { BrowserProvider, ethers } from 'ethers';

const EXTENDED_MARKETS: Record<string, string> = {
  BTC:  'BTC-USD',
  ETH:  'ETH-USD',
  SOL:  'SOL-USD',
  ARB:  'ARB-USD',
  LINK: 'LINK-USD',
  AVAX: 'AVAX-USD',
  AAPL: 'AAPL-USD',
  TSLA: 'TSLA-USD',
  GOLD: 'GOLD-USD',
};

export interface ExtendedOrderResult {
  success: boolean;
  message: string;
  orderId?: string;
}

export function useExtended() {
  const [isProcessing, setIsProcessing]       = useState(false);
  const [tradingEnabled, setTradingEnabled]   = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('extended_trading_enabled') === 'true';
  });

  // ─── 1. ONBOARD USER (once per wallet) ────────────────────────────────────
  const enableTrading = useCallback(async (walletAddress: string): Promise<ExtendedOrderResult> => {
    setIsProcessing(true);
    try {
      if (!(window as any).ethereum) throw new Error('No wallet connected');

      // Prompt signature immediately without waiting for slow background checks
      const provider  = new BrowserProvider((window as any).ethereum);
      const network   = await provider.getNetwork();
      const chainId   = Number(network.chainId) || 5042;
      const signer    = await provider.getSigner();
      const nonce     = Date.now();

      const domain = {
        name:    'ArcTerminalAI',
        version: '1',
        chainId,
        verifyingContract: '0x0000000000000000000000000000000000000000',
      };
      const types = {
        EnableTrading: [
          { name: 'action',  type: 'string' },
          { name: 'nonce',   type: 'uint64' },
        ],
      };
      const message = { action: 'Enable trading on ArcTerminalAI', nonce };

      const signature = await signer.signTypedData(domain, types, message);

      // Derive a deterministic Stark key from the signature
      const sigBytes  = ethers.getBytes(signature);
      const starkSeed = ethers.keccak256(sigBytes);
      const starkKey  = '0x' + starkSeed.slice(2, 66); // use first 32 bytes as public key

      // Register with Extended via our server
      const regRes = await fetch('/api/extended/account', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ wallet: walletAddress, starkKey, signature, nonce }),
      });
      const regData = await regRes.json();
      console.log('[Extended onboard]', JSON.stringify(regData));

      if (regData.status === 'ok') {
        localStorage.setItem('extended_trading_enabled', 'true');
        localStorage.setItem(`extended_stark_key_${walletAddress}`, starkKey);
        setTradingEnabled(true);
        return { success: true, message: 'Trading enabled on Extended.' };
      }

      const errMsg = regData?.response?.error?.message ?? regData?.response ?? 'Onboarding failed';
      return { success: false, message: typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg) };

    } catch (error: any) {
      console.error('[Extended enableTrading]', error);
      return { success: false, message: error?.message ?? 'Failed to enable trading' };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // ─── 2. PLACE ORDER ───────────────────────────────────────────────────────
  const placeExtendedOrder = useCallback(async (
    symbol:    string,
    isLong:    boolean,
    sizeUsd:   number,
    limitPx:   number,
    orderType: 'MARKET' | 'LIMIT' = 'MARKET',
  ): Promise<ExtendedOrderResult> => {
    setIsProcessing(true);
    try {
      const coin   = symbol.split(/[-/]/)[0].toUpperCase();
      const market = EXTENDED_MARKETS[coin] ?? `${coin}-USD`;

      const payload = {
        market,
        side:        isLong ? 'BUY' : 'SELL',
        type:        orderType,
        size:        sizeUsd.toFixed(2),
        price:       orderType === 'LIMIT' ? limitPx.toFixed(2) : undefined,
        timeInForce: orderType === 'MARKET' ? 'IOC' : 'GTC',
        reduceOnly:  false,
      };

      const res  = await fetch('/api/extended/order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      console.log('[Extended order]', JSON.stringify(data));

      if (data.status === 'ok') {
        const inner = data.response;
        if (inner?.status === 'OK' || inner?.data?.orderId) {
          return {
            success: true,
            message: `${isLong ? 'Long' : 'Short'} order placed for ${coin}`,
            orderId: inner?.data?.orderId,
          };
        }
        const errMsg = inner?.error?.message ?? inner?.message ?? JSON.stringify(inner);
        return { success: false, message: typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg) };
      }
      return { success: false, message: data.response ?? 'Order failed' };

    } catch (error: any) {
      console.error('[Extended order error]', error);
      return { success: false, message: error?.message ?? 'Order execution failed' };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // ─── 3. CANCEL ORDER ──────────────────────────────────────────────────────
  const cancelExtendedOrder = useCallback(async (orderId: string): Promise<ExtendedOrderResult> => {
    setIsProcessing(true);
    try {
      const res  = await fetch(`/api/extended/order?id=${orderId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'ok') return { success: true, message: 'Order cancelled' };
      return { success: false, message: data.response ?? 'Cancel failed' };
    } catch (error: any) {
      return { success: false, message: error?.message ?? 'Cancel failed' };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    tradingEnabled,
    enableTrading,
    placeExtendedOrder,
    cancelExtendedOrder,
  };
}
