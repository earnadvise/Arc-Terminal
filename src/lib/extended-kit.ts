import { useState, useCallback } from 'react';
import { BrowserProvider, ethers } from 'ethers';

const EXTENDED_API  = 'https://api.starknet.extended.exchange/api/v1';
const BUILDER_ID    = 304668;
const BUILDER_FEE   = 0.0005;

const EXTENDED_MARKETS: Record<string, string> = {
  BTC: 'BTC-USD-PERP', ETH: 'ETH-USD-PERP', SOL: 'SOL-USD-PERP',
  ARB: 'ARB-USD-PERP', LINK: 'LINK-USD-PERP', AVAX: 'AVAX-USD-PERP',
};

const ONBOARDING_DOMAIN = {
  name: 'extended.exchange', version: '1',
};

export interface ExtendedOrderResult {
  success: boolean;
  message: string;
  orderId?: string;
}

export function useExtended() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [tradingEnabled, setTradingEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('extended_jwt');
  });

  // ─── 1. ONBOARD — sign once, get JWT ──────────────────────────────────────
  const enableTrading = useCallback(async (walletAddress: string): Promise<ExtendedOrderResult> => {
    setIsProcessing(true);
    try {
      // Check if JWT still valid
      const stored = localStorage.getItem('extended_jwt');
      if (stored) {
        const testRes = await fetch(`${EXTENDED_API}/user/account`, {
          headers: { 'Authorization': `Bearer ${stored}` },
        });
        if (testRes.ok) {
          setTradingEnabled(true);
          return { success: true, message: 'Trading already enabled.' };
        }
        localStorage.removeItem('extended_jwt');
      }

      if (!(window as any).ethereum) throw new Error('No wallet connected');
      const provider = new BrowserProvider((window as any).ethereum);
      const network  = await provider.getNetwork();
      const chainId  = Number(network.chainId) || 5042;
      const signer   = await provider.getSigner();
      const nonce    = Date.now();

      // EIP-712 onboarding signature — Extended's standard format
      const domain = { ...ONBOARDING_DOMAIN, chainId };
      const types  = {
        OnboardingAction: [
          { name: 'action', type: 'string' },
          { name: 'onlySignOn', type: 'string' },
        ],
      };
      const message = {
        action:      'Enable Trading',
        onlySignOn:  'app.extended.exchange',
      };

      const signature = await signer.signTypedData(domain, types, message);

      // Exchange signature for JWT
      const res = await fetch(`${EXTENDED_API}/auth/ethereum`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ethAddress: walletAddress, signature, nonce }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Onboarding failed: ${err}`);
      }

      const data = await res.json();
      const jwt  = data?.token ?? data?.data?.token ?? data?.accessToken;
      if (!jwt) throw new Error('No token returned from Extended');

      localStorage.setItem('extended_jwt', jwt);
      setTradingEnabled(true);
      return { success: true, message: 'Trading enabled on Extended.' };

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
      const jwt = localStorage.getItem('extended_jwt');
      if (!jwt) return { success: false, message: 'Please enable trading first.' };

      const coin   = symbol.split(/[-/]/)[0].toUpperCase();
      const market = EXTENDED_MARKETS[coin] ?? `${coin}-USD-PERP`;

      const payload = {
        market,
        side:          isLong ? 'BUY' : 'SELL',
        type:          orderType,
        size:          sizeUsd.toFixed(2),
        price:         orderType === 'LIMIT' ? limitPx.toFixed(2) : undefined,
        time_in_force: orderType === 'MARKET' ? 'IOC' : 'GTC',
        reduce_only:   false,
        builder_id:    BUILDER_ID,
        builder_fee:   BUILDER_FEE,
      };

      const res = await fetch(`${EXTENDED_API}/order`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log('[Extended order]', JSON.stringify(data));

      if (res.ok && (data?.status === 'OK' || data?.data?.order_id || data?.order_id)) {
        return {
          success: true,
          message: `${isLong ? 'Long' : 'Short'} order placed for ${coin}`,
          orderId: data?.data?.order_id ?? data?.order_id,
        };
      }

      // JWT expired — clear and ask user to re-enable
      if (res.status === 401) {
        localStorage.removeItem('extended_jwt');
        setTradingEnabled(false);
        return { success: false, message: 'Session expired. Please click Enable Trading again.' };
      }

      const errMsg = data?.error?.message ?? data?.message ?? JSON.stringify(data);
      return { success: false, message: typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg) };

    } catch (error: any) {
      console.error('[Extended order error]', error);
      return { success: false, message: error?.message ?? 'Order failed' };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // ─── 3. CANCEL ORDER ──────────────────────────────────────────────────────
  const cancelExtendedOrder = useCallback(async (orderId: string): Promise<ExtendedOrderResult> => {
    setIsProcessing(true);
    try {
      const jwt = localStorage.getItem('extended_jwt');
      if (!jwt) return { success: false, message: 'Not authenticated.' };
      const res  = await fetch(`${EXTENDED_API}/order/${orderId}`, {
        method:  'DELETE',
        headers: { 'Authorization': `Bearer ${jwt}` },
      });
      if (res.ok) return { success: true, message: 'Order cancelled.' };
      return { success: false, message: 'Cancel failed.' };
    } catch (error: any) {
      return { success: false, message: error?.message ?? 'Cancel failed' };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { isProcessing, tradingEnabled, enableTrading, placeExtendedOrder, cancelExtendedOrder };
}
