import { useState, useCallback, useEffect } from 'react';
import { BrowserProvider, ethers } from 'ethers';

const ARC_PERP_ROUTER = '0x68E6EF57B846CA3dBb3Aed6E8e7512BB2180C8C7';

const CHAIN_MAP: Record<string, number> = {
  ARB: 42161, Base: 8453, OP: 10, ETH: 1, Arc: 5042,
};

const ROUTER_MAP: Record<string, string> = {
  Arc: ARC_PERP_ROUTER, Base: ARC_PERP_ROUTER, OP: ARC_PERP_ROUTER, ETH: ARC_PERP_ROUTER, ARB: ARC_PERP_ROUTER,
};

const USDC_MAP: Record<string, string> = {
  Arc:  '0x3600000000000000000000000000000000000000',
  Base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  OP:   '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  ETH:  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  ARB:  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
};

const HL_APPROVE_AGENT_DOMAIN = {
  name: 'HyperliquidSignTransaction', version: '1', chainId: 42161,
  verifyingContract: '0x0000000000000000000000000000000000000000',
};

async function switchToChain(chainId: number): Promise<void> {
  await (window as any).ethereum.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: `0x${chainId.toString(16)}` }],
  });
}

async function ensureExactAllowance(signer: ethers.Signer, usdcAddress: string, spender: string, amount: bigint): Promise<void> {
  const usdc = new ethers.Contract(usdcAddress, ['function allowance(address,address) view returns (uint256)', 'function approve(address,uint256) returns (bool)'], signer);
  const owner = await signer.getAddress();
  const current: bigint = await usdc.allowance(owner, spender);
  if (current < amount) { const tx = await usdc.approve(spender, amount); await tx.wait(); }
}

export function useHyperliquid() {
  const [hlBalance, setHlBalance] = useState<number>(0);
  const [sessionKeyActive, setSessionKeyActive] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const active = localStorage.getItem('hl_session_key_active') === 'true';
    const key = localStorage.getItem('hl_agent_private_key');
    if (active && key) setSessionKeyActive(true);
    else { localStorage.removeItem('hl_session_key_active'); setSessionKeyActive(false); }
  }, []);

  const fetchRealBalance = useCallback(async (userAddress: string) => {
    try {
      const contract = new ethers.Contract(ARC_PERP_ROUTER, ['function userMargin(address) view returns (uint256)'], new ethers.JsonRpcProvider('https://rpc.mainnet.arc.io'));
      const raw: bigint = await contract.userMargin(userAddress);
      setHlBalance(Number(ethers.formatUnits(raw, 6)));
    } catch (e) { console.error('Failed to fetch margin balance:', e); }
  }, []);

  const depositToHyperliquid = async (amount: number, sourceChain: string, userAddress?: string) => {
    setIsProcessing(true);
    try {
      if (!(window as any).ethereum) throw new Error('No crypto wallet connected');
      const provider = new BrowserProvider((window as any).ethereum);
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      let resolvedChain = sourceChain === 'Auto'
        ? (Object.entries(CHAIN_MAP).find(([, id]) => id === currentChainId)?.[0] ?? 'Arc')
        : sourceChain;
      const targetChainId = CHAIN_MAP[resolvedChain] ?? CHAIN_MAP['Arc'];
      if (sourceChain !== 'Auto' && currentChainId !== targetChainId) await switchToChain(targetChainId);
      const signer = await (new BrowserProvider((window as any).ethereum)).getSigner();
      const targetRouter = ROUTER_MAP[resolvedChain] ?? ARC_PERP_ROUTER;
      const targetUsdc = USDC_MAP[resolvedChain] ?? USDC_MAP['Arc'];
      const parsedAmount = ethers.parseUnits(amount.toString(), 6);
      await ensureExactAllowance(signer, targetUsdc, targetRouter, parsedAmount);
      const router = new ethers.Contract(targetRouter, ['function deposit(uint256 amount) external'], signer);
      const tx = await router.deposit(parsedAmount);
      await tx.wait();
      if (userAddress) await fetchRealBalance(userAddress);
      return { success: true, message: `Deposited ${amount} USDC into your Arc Terminal margin account.` };
    } catch (error: any) {
      console.error('Deposit error:', error);
      return { success: false, message: error?.message ?? 'Deposit failed' };
    } finally { setIsProcessing(false); }
  };

  const withdrawFromHyperliquid = async (amount: number, destinationChain: string, userAddress?: string) => {
    setIsProcessing(true);
    try {
      if (!(window as any).ethereum) throw new Error('No crypto wallet connected');
      if (amount > hlBalance) return { success: false, message: 'Insufficient margin' };
      const provider = new BrowserProvider((window as any).ethereum);
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      const resolvedChain = destinationChain === 'Auto'
        ? (Object.entries(CHAIN_MAP).find(([, id]) => id === currentChainId)?.[0] ?? 'Arc')
        : destinationChain;
      const targetChainId = CHAIN_MAP[resolvedChain] ?? CHAIN_MAP['Arc'];
      if (destinationChain !== 'Auto' && currentChainId !== targetChainId) await switchToChain(targetChainId);
      const signer = await (new BrowserProvider((window as any).ethereum)).getSigner();
      const targetRouter = ROUTER_MAP[resolvedChain] ?? ARC_PERP_ROUTER;
      const parsedAmount = ethers.parseUnits(amount.toString(), 6);
      const router = new ethers.Contract(targetRouter, ['function withdraw(uint256 amount) external'], signer);
      const tx = await router.withdraw(parsedAmount);
      await tx.wait();
      if (userAddress) await fetchRealBalance(userAddress);
      return { success: true, message: `Withdrew ${amount} USDC to your wallet.` };
    } catch (error: any) {
      console.error('Withdraw error:', error);
      return { success: false, message: error?.message ?? 'Withdraw failed' };
    } finally { setIsProcessing(false); }
  };

  const enableTrading = async () => {
    setIsProcessing(true);
    try {
      if (!(window as any).ethereum) throw new Error('No crypto wallet found');
      const provider = new BrowserProvider((window as any).ethereum);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== 42161) await switchToChain(42161);
      const signer = await (new BrowserProvider((window as any).ethereum)).getSigner();
      const agentWallet = ethers.Wallet.createRandom();
      const nonce = Date.now();
      const action = { hyperliquidChain: 'Mainnet', agentAddress: agentWallet.address, agentName: 'ArcTerminal_Session', nonce };
      const types = { 'HyperliquidTransaction:ApproveAgent': [{ name: 'hyperliquidChain', type: 'string' }, { name: 'agentAddress', type: 'address' }, { name: 'agentName', type: 'string' }, { name: 'nonce', type: 'uint64' }] };
      const rawSignature = await signer.signTypedData(HL_APPROVE_AGENT_DOMAIN, types, action);
      const { r, s, v } = ethers.Signature.from(rawSignature);
      const res = await fetch('/api/hyperliquid/exchange', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: { type: 'approveAgent', ...action, signatureChainId: '0xa4b1' }, nonce, signature: { r, s, v } }) });
      const data = await res.json();
      if (data.status !== 'ok') throw new Error(data.response?.data?.statuses?.[0]?.error ?? 'Failed to authorize agent');
      localStorage.setItem('hl_session_key_active', 'true');
      localStorage.setItem('hl_agent_private_key', agentWallet.privateKey);
      setSessionKeyActive(true);
      return { success: true };
    } catch (error: any) {
      console.error('enableTrading error:', error);
      return { success: false, message: error?.message ?? 'User rejected session key signature' };
    } finally { setIsProcessing(false); }
  };

  // Orders are placed server-side via /api/hyperliquid/order using the HL SDK.
  // The server holds HL_AGENT_PRIVATE_KEY — the browser never touches it.
  const placeHyperliquidOrder = async (symbol: string, isBuy: boolean, sz: number, limitPx: number, leverage: number) => {
    setIsProcessing(true);
    try {
      const coin = symbol.split(/[-/]/)[0].toUpperCase();
      const response = await fetch('/api/hyperliquid/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: coin, isBuy, sz, limitPx: isBuy ? limitPx * 1.005 : limitPx * 0.995, orderType: 'Ioc' }),
      });
      const result = await response.json();
      console.log('[HL order response]', JSON.stringify(result));
      if (result.status === 'ok') {
        const statuses = result.response?.data?.statuses ?? [];
        const firstError = statuses.find((s: any) => s.error)?.error;
        if (firstError) return { success: false, message: firstError };
        return { success: true, message: `${isBuy ? 'Long' : 'Short'} order placed for ${sz} ${coin}` };
      } else {
        const msg = result.response?.data?.statuses?.[0]?.error ?? result.response ?? 'Order rejected';
        return { success: false, message: typeof msg === 'string' ? msg : JSON.stringify(msg) };
      }
    } catch (error: any) {
      console.error('Order error:', error);
      return { success: false, message: error?.message ?? 'Order execution failed' };
    } finally { setIsProcessing(false); }
  };

  return { hlBalance, sessionKeyActive, isProcessing, fetchRealBalance, depositToHyperliquid, withdrawFromHyperliquid, enableTrading, placeHyperliquidOrder };
}
