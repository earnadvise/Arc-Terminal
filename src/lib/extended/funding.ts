import { BrowserProvider, Contract, getAddress, parseUnits, type Eip1193Provider } from 'ethers';
import { extendedRequest, ExtendedError } from './api';
import { EXTENDED_COLLATERAL_ID, EXTENDED_STARKNET_DOMAIN } from './config';
import { signHash, withdrawalMessageHash, type StarkKeyPair } from './stark';

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

async function getArcBridge(apiKey: string): Promise<{ chain: string; contractAddress: string }> {
  const config = await extendedRequest<BridgeConfig>('/api/v1/user/bridge/config', { apiKey });
  const arc = (config?.chains ?? []).find((c) => /^arc/i.test(c.chain));
  if (!arc) {
    throw new Error('Extended has not enabled Arc for this account yet. Ask Extended support to enable the Arc bridge.');
  }
  return { chain: arc.chain, contractAddress: getAddress(arc.contractAddress) };
}

const assertAmount = (amount: string) => {
  if (!/^\d+(\.\d{1,6})?$/.test(amount) || Number(amount) <= 0) {
    throw new Error('Enter a valid USDC amount (up to 6 decimals).');
  }
};

/** Ask Extended for a bridge quote. The docs show both USDC and USD as the asset symbol, so try USDC first. */
async function requestBridgeQuote(
  apiKey: string,
  chainIn: string,
  chainOut: string,
  amount: string,
): Promise<{ id: string; fee: string; asset: string }> {
  let lastError: unknown;
  for (const asset of ['USDC', 'USD']) {
    try {
      const quote = await extendedRequest<{ id: string; fee: string }>('/api/v1/user/bridge/quote', {
        apiKey,
        query: { chainIn, chainOut, amount, asset },
      });
      if (!quote?.id) throw new Error('Extended returned no quote id.');
      return { id: String(quote.id), fee: String(quote.fee ?? '0'), asset };
    } catch (e) {
      lastError = e;
      if (!(e instanceof ExtendedError)) throw e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not get a bridge quote.');
}

/** Commit a quote and return its hex commitment id. Anything unexpected aborts before any funds move. */
async function commitBridgeQuote(apiKey: string, quoteId: string): Promise<string> {
  if (!/^[0-9a-f]+$/i.test(quoteId.replace(/^0x/i, ''))) throw new Error('Unexpected quote id format. Nothing was sent.');
  const committed = await extendedRequest<unknown>('/api/v1/user/bridge/quote', {
    method: 'POST',
    apiKey,
    query: { id: quoteId },
  });
  const obj = (committed ?? {}) as { quoteId?: string; id?: string; commitmentId?: string };
  const id =
    typeof committed === 'string' || typeof committed === 'number'
      ? String(committed)
      : (obj.quoteId ?? obj.id ?? obj.commitmentId ?? quoteId);
  const hexId = id.replace(/^0x/i, '');
  if (!/^[0-9a-f]+$/i.test(hexId)) throw new Error('Unexpected commitment id format. Nothing was sent.');
  return hexId;
}

/** Deposit step 1 of 2: quote so the user sees the fee before anything is committed. */
export async function quoteArcDeposit(apiKey: string, amount: string): Promise<DepositQuote> {
  assertAmount(amount);
  const arc = await getArcBridge(apiKey);
  const quote = await requestBridgeQuote(apiKey, arc.chain, 'STRK', amount);
  return { ...quote, amount, chain: arc.chain, contractAddress: arc.contractAddress };
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
  await ensureArcNetwork(ethereum);
  const provider = new BrowserProvider(ethereum);
  const code = await provider.getCode(quote.contractAddress);
  if (code === '0x') throw new Error('Bridge contract not found on Arc. Nothing was sent.');

  const hexId = await commitBridgeQuote(apiKey, quote.id);
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

interface AccountInfo {
  accountId: number | string;
  l2Key: string;
  l2Vault: number | string;
  bridgeStarknetAddress?: string;
}

/** Withdraw step 1 of 2: quote the bridge from Extended back to Arc. */
export async function quoteArcWithdraw(apiKey: string, amount: string, withdrawable: number): Promise<DepositQuote> {
  assertAmount(amount);
  if (Number(amount) > withdrawable) {
    throw new Error(`You can withdraw up to ${withdrawable.toFixed(2)} USDC right now. Close positions to free more.`);
  }
  const arc = await getArcBridge(apiKey);
  const quote = await requestBridgeQuote(apiKey, 'STRK', arc.chain, amount);
  return { ...quote, amount, chain: arc.chain, contractAddress: arc.contractAddress };
}

/**
 * Withdraw step 2 of 2: commit the quote, then submit the Stark-signed withdrawal request.
 * Extended's bridge then sends the USDC to the wallet linked to the account.
 */
export async function executeArcWithdraw(
  apiKey: string,
  quote: DepositQuote,
  keys: StarkKeyPair,
): Promise<{ withdrawalId: string }> {
  const info = await extendedRequest<AccountInfo>('/api/v1/user/account/info', { apiKey });
  if (!info?.bridgeStarknetAddress) throw new Error('Your Extended account has no bridge address yet. Nothing was sent.');
  if (BigInt(info.l2Key) !== BigInt(keys.publicKey)) throw new Error('Trading key does not match this account. Nothing was sent.');
  const vault = Number(info.l2Vault);
  const starkAmount = parseUnits(quote.amount, USDC_DECIMALS).toString();

  const commitment = await commitBridgeQuote(apiKey, quote.id);

  const expirationSeconds = Math.ceil(Date.now() / 1000) + 15 * 24 * 60 * 60;
  const salt = Math.floor(Math.random() * 2 ** 32);
  const hash = withdrawalMessageHash({
    recipient: info.bridgeStarknetAddress,
    positionId: vault,
    collateralId: EXTENDED_COLLATERAL_ID,
    amount: starkAmount,
    expiration: expirationSeconds,
    salt,
    userPublicKey: keys.publicKey,
    domain: EXTENDED_STARKNET_DOMAIN,
  });
  const signature = signHash(keys.privateKey, hash);

  const withdrawalId = await extendedRequest<number | string>('/api/v1/user/withdrawal', {
    method: 'POST',
    apiKey,
    body: {
      accountId: Number(info.accountId),
      amount: quote.amount,
      chainId: quote.chain,
      asset: 'USD',
      quoteId: commitment,
      settlement: {
        recipient: info.bridgeStarknetAddress,
        positionId: vault,
        collateralId: EXTENDED_COLLATERAL_ID,
        amount: Number(starkAmount),
        expiration: { seconds: expirationSeconds },
        salt,
        signature,
      },
    },
  });
  return { withdrawalId: String(withdrawalId) };
}
