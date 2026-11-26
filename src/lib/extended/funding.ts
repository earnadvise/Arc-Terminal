import { BrowserProvider, Contract, getAddress, parseUnits, type Eip1193Provider } from 'ethers';
import { extendedRequest, ExtendedError } from './api';

/** USDC (ERC-20 view, 6 decimals) on Arc. Same address the rest of the app uses. */
export const ARC_USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
const ARC_CHAIN_ID = 5042;
const ARC_CHAIN_HEX = '0x13b2';
const USDC_DECIMALS = 6;

const BRIDGE_ABI = ['function depositWithId(address token, uint256 amount, uint256 commitmentId)'];
const ERC20_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

export interface DepositQuote {
  id: string;
  fee: string;
  amount: string;
  chain: string;
  asset: string;
  contractAddress: string;
}

interface BridgeConfig {
  chains?: { chain: string; contractAddress: string }[];
}

/** Step 1 of 2: ask Extended for a bridge quote so the user can see the fee before anything is committed. */
export async function quoteArcDeposit(apiKey: string, amount: string): Promise<DepositQuote> {
  if (!/^\d+(\.\d{1,6})?$/.test(amount) || Number(amount) <= 0) {
    throw new Error('Enter a valid USDC amount (up to 6 decimals).');
  }
  const config = await extendedRequest<BridgeConfig>('/api/v1/user/bridge/config', { apiKey });
  const arc = (config?.chains ?? []).find((c) => /^arc/i.test(c.chain));
  if (!arc) {
    throw new Error('Extended has not enabled Arc deposits for this account yet. Ask Extended support to enable the Arc bridge.');
  }
  const contractAddress = getAddress(arc.contractAddress);

  // The docs show both USDC and USD as the asset symbol, so try USDC first and fall back.
  let lastError: unknown;
  for (const asset of ['USDC', 'USD']) {
    try {
      const quote = await extendedRequest<{ id: string; fee: string }>('/api/v1/user/bridge/quote', {
        apiKey,
        query: { chainIn: arc.chain, chainOut: 'STRK', amount, asset },
      });
      if (!quote?.id) throw new Error('Extended returned no quote id.');
      return { id: String(quote.id), fee: String(quote.fee ?? '0'), amount, chain: arc.chain, asset, contractAddress };
    } catch (e) {
      lastError = e;
      if (!(e instanceof ExtendedError)) throw e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not get a bridge quote.');
}

async function ensureArcNetwork(ethereum: Eip1193Provider): Promise<void> {
  const provider = new BrowserProvider(ethereum);
  const network = await provider.getNetwork();
  if (Number(network.chainId) === ARC_CHAIN_ID) return;
  await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ARC_CHAIN_HEX }] });
}

/**
 * Step 2 of 2: commit the quote, then send the on-chain deposit with the quote id as the commitment id.
 * Funds sent with a wrong id are not recoverable, so every input is validated and the call is simulated first.
 */
export async function executeArcDeposit(
  ethereum: Eip1193Provider,
  apiKey: string,
  quote: DepositQuote,
): Promise<{ txHash: string }> {
  if (!/^[0-9a-f]+$/i.test(quote.id.replace(/^0x/i, ''))) {
    throw new Error('Unexpected quote id format. Nothing was sent.');
  }
  await ensureArcNetwork(ethereum);
  const provider = new BrowserProvider(ethereum);
  const code = await provider.getCode(quote.contractAddress);
  if (code === '0x') throw new Error('Bridge contract not found on Arc. Nothing was sent.');

  const committed = await extendedRequest<unknown>('/api/v1/user/bridge/quote', {
    method: 'POST',
    apiKey,
    query: { id: quote.id },
  });
  const committedId =
    typeof committed === 'string' || typeof committed === 'number'
      ? String(committed)
      : ((committed as { quoteId?: string; id?: string; commitmentId?: string } | null)?.quoteId ??
        (committed as { id?: string } | null)?.id ??
        (committed as { commitmentId?: string } | null)?.commitmentId ??
        quote.id);
  const hexId = committedId.replace(/^0x/i, '');
  if (!/^[0-9a-f]+$/i.test(hexId)) throw new Error('Unexpected commitment id format. Nothing was sent.');
  const commitmentId = BigInt(`0x${hexId}`);

  const signer = await provider.getSigner();
  const owner = await signer.getAddress();
  const amount = parseUnits(quote.amount, USDC_DECIMALS);

  const usdc = new Contract(ARC_USDC_ADDRESS, ERC20_ABI, signer);
  const allowance: bigint = await usdc.allowance(owner, quote.contractAddress);
  if (allowance < amount) {
    const approveTx = await usdc.approve(quote.contractAddress, amount);
    await approveTx.wait();
  }

  const bridge = new Contract(quote.contractAddress, BRIDGE_ABI, signer);
  await bridge.depositWithId.staticCall(ARC_USDC_ADDRESS, amount, commitmentId); // reverts here instead of losing funds
  const tx = await bridge.depositWithId(ARC_USDC_ADDRESS, amount, commitmentId);
  await tx.wait();
  return { txHash: tx.hash as string };
}
