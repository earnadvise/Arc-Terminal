'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserProvider } from 'ethers';
import type { OpenOrder, Position } from '@/utils/mockData';
import { ExtendedError, extendedRequest } from './api';
import { EXTENDED_BUILDER_FEE, EXTENDED_BUILDER_ID, toMarketName } from './config';
import {
  createApiKey,
  deriveKeysFromWallet,
  hasMismatchedAccount,
  listAccounts,
  matchAccount,
  onboardAccount,
} from './onboarding';
import { buildSignedOrder, type ExtendedMarket } from './orders';
import { executeArcDeposit, executeArcWithdraw, quoteArcDeposit, quoteArcWithdraw, type DepositQuote } from './funding';

export interface ExtendedBalance {
  equity: number;
  available: number;
  withdrawable: number;
  unrealisedPnl: number;
}

export interface ExtendedResult {
  success: boolean;
  message: string;
}

interface StoredSession {
  apiKey: string;
  vault: number;
  publicKey: string;
}

interface Unlocked extends StoredSession {
  privateKey: string;
}

interface RawPosition {
  id: number;
  market: string;
  side: 'LONG' | 'SHORT';
  leverage: string;
  size: string;
  openPrice: string;
  markPrice: string;
  liquidationPrice: string;
  margin: string;
  unrealisedPnl: string;
}

interface RawOrder {
  id: number;
  market: string;
  type: string;
  side: 'BUY' | 'SELL';
  status: string;
  price?: string;
  qty: string;
  filledQty?: string;
  trigger?: { triggerPrice?: string };
  createdTime?: number;
}

interface RawFee {
  takerFeeRate: string;
  builderFeeRate?: string;
}

const EMPTY_BALANCE: ExtendedBalance = { equity: 0, available: 0, withdrawable: 0, unrealisedPnl: 0 };
const storageKey = (address: string) => `extended:v1:${address.toLowerCase()}`;
const num = (v: string | number | undefined) => Number(v ?? 0) || 0;
const toAppSymbol = (market: string) => `${market.split('-')[0]}-PERP`;

const toOpenOrder = (o: RawOrder, leverageByMarket: Record<string, number>): OpenOrder => ({
  id: String(o.id),
  symbol: toAppSymbol(o.market),
  side: o.side,
  type: o.type === 'CONDITIONAL' ? 'STOP' : o.type === 'TPSL' ? 'TPSL' : 'LIMIT',
  price: num(o.type === 'CONDITIONAL' ? o.trigger?.triggerPrice : o.price),
  amount: num(o.qty) - num(o.filledQty),
  leverage: leverageByMarket[o.market] ?? 0,
  marginMode: 'CROSS',
  status: o.status === 'PARTIALLY_FILLED' ? 'PARTIAL' : 'OPEN',
  time: o.createdTime ? new Date(o.createdTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
});

const toPosition = (p: RawPosition): Position => ({
  id: String(p.id),
  symbol: toAppSymbol(p.market),
  side: p.side,
  size: num(p.size),
  entryPrice: num(p.openPrice),
  markPrice: num(p.markPrice),
  liqPrice: num(p.liquidationPrice),
  margin: num(p.margin),
  leverage: num(p.leverage),
  unrealizedPnl: num(p.unrealisedPnl),
  marginMode: 'CROSS',
});

const readStored = (address: string): StoredSession | null => {
  try {
    const raw = localStorage.getItem(storageKey(address));
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
};

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : 'Something went wrong');

export function useExtended(walletAddress: string) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'ready'>('idle');
  const [hasSession, setHasSession] = useState(false);
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState<ExtendedBalance>(EMPTY_BALANCE);
  const [positions, setPositions] = useState<Position[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const unlocked = useRef<Unlocked | null>(null);
  const stored = useRef<StoredSession | null>(null);

  // Load a saved session (API key only). The Stark private key is never persisted.
  useEffect(() => {
    unlocked.current = null;
    stored.current = walletAddress ? readStored(walletAddress) : null;
    setHasSession(Boolean(stored.current));
    setStatus('idle');
    setBalance(EMPTY_BALANCE);
    setPositions([]);
    setOpenOrders([]);
  }, [walletAddress]);

  const refresh = useCallback(async () => {
    const apiKey = stored.current?.apiKey;
    if (!apiKey) return;
    try {
      const [bal, pos, ords] = await Promise.all([
        extendedRequest<Record<string, string>>('/api/v1/user/balance', { apiKey }).catch((e) => {
          if (e instanceof ExtendedError && e.httpStatus === 404) return null; // 404 means a zero balance
          throw e;
        }),
        extendedRequest<RawPosition[]>('/api/v1/user/positions', { apiKey }),
        extendedRequest<RawOrder[]>('/api/v1/user/orders', { apiKey }).catch(() => [] as RawOrder[]),
      ]);
      setBalance(
        bal
          ? {
              equity: num(bal.equity),
              available: num(bal.availableForTrade),
              withdrawable: num(bal.availableForWithdrawal),
              unrealisedPnl: num(bal.unrealisedPnl),
            }
          : EMPTY_BALANCE,
      );
      const rawPositions = Array.isArray(pos) ? pos : [];
      setPositions(rawPositions.map(toPosition));
      const leverageByMarket = Object.fromEntries(rawPositions.map((p) => [p.market, num(p.leverage)]));
      setOpenOrders((Array.isArray(ords) ? ords : []).map((o) => toOpenOrder(o, leverageByMarket)));
    } catch (e) {
      console.warn('[extended] refresh failed', messageOf(e));
    }
  }, []);

  useEffect(() => {
    if (!hasSession) return;
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [hasSession, refresh]);

  /** Unlock trading: one signature re-derives the Stark key. First time also creates the account and API key. */
  const connect = useCallback(async (): Promise<Unlocked> => {
    if (unlocked.current) return unlocked.current;
    const ethereum = (window as unknown as { ethereum?: ConstructorParameters<typeof BrowserProvider>[0] }).ethereum;
    if (!ethereum) throw new Error('No wallet found');
    setStatus('connecting');
    try {
      const signer = await new BrowserProvider(ethereum).getSigner();
      if ((await signer.getAddress()).toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error('Switch your wallet to the connected account and try again.');
      }
      const keys = await deriveKeysFromWallet(signer);

      let session = stored.current;
      if (!session || BigInt(session.publicKey) !== BigInt(keys.publicKey)) {
        // Extended answers 401/404 for a wallet that has no account yet, so treat that as "none".
        const accounts = await listAccounts(signer).catch((e) => {
          if (e instanceof ExtendedError && (e.httpStatus === 401 || e.httpStatus === 404)) return [];
          throw e;
        });
        if (hasMismatchedAccount(accounts, keys) && !matchAccount(accounts, keys)) {
          throw new Error(
            'This wallet already has an Extended account created with a different key (for example a Starknet wallet), so it cannot trade here.',
          );
        }
        const account = matchAccount(accounts, keys) ?? (await onboardAccount(signer, keys));
        const apiKey = await createApiKey(signer, account);
        session = { apiKey, vault: account.l2Vault, publicKey: keys.publicKey };
        localStorage.setItem(storageKey(walletAddress), JSON.stringify(session));
        stored.current = session;
        setHasSession(true);
      }
      unlocked.current = { ...session, privateKey: keys.privateKey };
      setStatus('ready');
      return unlocked.current;
    } catch (e) {
      setStatus('idle');
      throw e;
    }
  }, [walletAddress]);

  const submitOrder = useCallback(
    async (args: {
      symbol: string;
      side: 'BUY' | 'SELL';
      type: 'MARKET' | 'LIMIT';
      size: number;
      price?: number;
      leverage?: number;
      reduceOnly?: boolean;
    }): Promise<ExtendedResult> => {
      setBusy(true);
      try {
        const session = await connect();
        const marketName = toMarketName(args.symbol);
        const [market] = await extendedRequest<ExtendedMarket[]>('/api/v1/info/markets', { query: { market: marketName } });
        if (!market || !market.active) throw new Error(`${marketName} is not available on Extended`);

        if (args.leverage && !args.reduceOnly) {
          await extendedRequest('/api/v1/user/leverage', {
            method: 'PATCH',
            apiKey: session.apiKey,
            body: { market: marketName, leverage: String(args.leverage) },
          });
        }

        const fees = await extendedRequest<RawFee[]>('/api/v1/user/fees', {
          apiKey: session.apiKey,
          query: { market: marketName, builderId: EXTENDED_BUILDER_ID },
        }).catch(() => [] as RawFee[]);
        const takerFeeRate = fees[0]?.takerFeeRate ?? '0.00025';
        const cap = num(fees[0]?.builderFeeRate);
        const builderFee = String(cap > 0 ? Math.min(EXTENDED_BUILDER_FEE, cap) : EXTENDED_BUILDER_FEE);

        const body = buildSignedOrder(
          { vault: session.vault, publicKey: session.publicKey, privateKey: session.privateKey },
          {
            market,
            side: args.side,
            type: args.type,
            qty: String(args.size),
            price: args.price !== undefined ? String(args.price) : undefined,
            reduceOnly: args.reduceOnly,
            takerFeeRate,
            builderId: EXTENDED_BUILDER_ID,
            builderFee,
          },
        );
        await extendedRequest('/api/v1/user/order', { method: 'POST', apiKey: session.apiKey, body });
        setTimeout(refresh, 1500);
        return { success: true, message: `${args.side === 'BUY' ? 'Buy' : 'Sell'} order sent for ${body.qty} ${marketName}` };
      } catch (e) {
        return { success: false, message: messageOf(e) };
      } finally {
        setBusy(false);
      }
    },
    [connect, refresh],
  );

  const placeOrder = useCallback(
    (args: { symbol: string; side: 'LONG' | 'SHORT'; type: 'MARKET' | 'LIMIT'; size: number; price?: number; leverage?: number }) =>
      submitOrder({ ...args, side: args.side === 'LONG' ? 'BUY' : 'SELL' }),
    [submitOrder],
  );

  const closePosition = useCallback(
    (id: string, size?: number): Promise<ExtendedResult> => {
      const pos = positions.find((p) => p.id === id);
      if (!pos) return Promise.resolve({ success: false, message: 'Position not found' });
      return submitOrder({
        symbol: pos.symbol,
        side: pos.side === 'LONG' ? 'SELL' : 'BUY',
        type: 'MARKET',
        size: size && size > 0 && size < pos.size ? size : pos.size,
        reduceOnly: true,
      });
    },
    [positions, submitOrder],
  );

  const cancelOrder = useCallback(
    async (id: string): Promise<ExtendedResult> => {
      const apiKey = stored.current?.apiKey;
      if (!apiKey) return { success: false, message: 'Trading is not unlocked yet.' };
      setBusy(true);
      try {
        await extendedRequest(`/api/v1/user/order/${encodeURIComponent(id)}`, { method: 'DELETE', apiKey });
        await refresh();
        return { success: true, message: 'Order cancelled.' };
      } catch (e) {
        return { success: false, message: messageOf(e) };
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  /** Deposit step 1: create the account if needed, then get a bridge quote so the user sees the fee. */
  const quoteDeposit = useCallback(
    async (amount: string): Promise<{ quote?: DepositQuote; message: string }> => {
      setBusy(true);
      try {
        const session = await connect();
        const quote = await quoteArcDeposit(session.apiKey, amount);
        return { quote, message: `Bridge fee ${quote.fee} USDC` };
      } catch (e) {
        return { message: messageOf(e) };
      } finally {
        setBusy(false);
      }
    },
    [connect],
  );

  /** Deposit step 2: commit the quote and send the on-chain deposit from Arc. */
  const deposit = useCallback(
    async (quote: DepositQuote): Promise<ExtendedResult> => {
      const apiKey = stored.current?.apiKey;
      const ethereum = (window as unknown as { ethereum?: ConstructorParameters<typeof BrowserProvider>[0] }).ethereum;
      if (!apiKey || !ethereum) return { success: false, message: 'Wallet or session missing. Try again.' };
      setBusy(true);
      try {
        const { txHash } = await executeArcDeposit(ethereum as never, apiKey, quote);
        setTimeout(refresh, 15000);
        setTimeout(refresh, 60000);
        return { success: true, message: `Deposit sent (${txHash.slice(0, 10)}...). It usually shows in your balance within about a minute.` };
      } catch (e) {
        return { success: false, message: messageOf(e) };
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  /** Withdraw step 1: quote the bridge back to Arc so the user sees the fee first. */
  const quoteWithdraw = useCallback(
    async (amount: string): Promise<{ quote?: DepositQuote; message: string }> => {
      setBusy(true);
      try {
        const session = await connect();
        const quote = await quoteArcWithdraw(session.apiKey, amount, balance.withdrawable);
        return { quote, message: `Bridge fee ${quote.fee} USDC` };
      } catch (e) {
        return { message: messageOf(e) };
      } finally {
        setBusy(false);
      }
    },
    [connect, balance.withdrawable],
  );

  /** Withdraw step 2: commit the quote and submit the signed withdrawal. */
  const withdraw = useCallback(
    async (quote: DepositQuote): Promise<ExtendedResult> => {
      setBusy(true);
      try {
        const session = await connect();
        await executeArcWithdraw(session.apiKey, quote, { privateKey: session.privateKey, publicKey: session.publicKey });
        setTimeout(refresh, 10000);
        setTimeout(refresh, 60000);
        return { success: true, message: 'Withdrawal requested. The USDC should reach your Arc wallet in about 5 minutes.' };
      } catch (e) {
        return { success: false, message: messageOf(e) };
      } finally {
        setBusy(false);
      }
    },
    [connect, refresh],
  );

  return {
    status, hasSession, busy, balance, positions, openOrders,
    connect, refresh, placeOrder, closePosition, cancelOrder, quoteDeposit, deposit, quoteWithdraw, withdraw,
  };
}
