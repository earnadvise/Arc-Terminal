import type { Signer } from 'ethers';
import { extendedRequest } from './api';
import { EXTENDED_ONBOARDING_HOST, EXTENDED_SIGNING_DOMAIN } from './config';
import { deriveStarkKeys, signOnboardingBinding, type StarkKeyPair } from './stark';

export interface ExtendedAccount {
  accountId: number;
  accountIndex: number;
  l2Vault: number;
  l2Key: string;
  apiKeys?: string[];
}

const L1_SIGNATURE = 'L1_SIGNATURE';
const L1_MESSAGE_TIME = 'L1_MESSAGE_TIME';
const ACTIVE_ACCOUNT = 'X-X10-ACTIVE-ACCOUNT';

const isoNow = (): string => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const sameKey = (a: string, b: string): boolean => BigInt(a) === BigInt(b);

/** One wallet signature. The Stark key pair is derived from it, so it is never stored or sent. */
export async function deriveKeysFromWallet(signer: Signer, accountIndex = 0): Promise<StarkKeyPair> {
  const wallet = await signer.getAddress();
  const signature = await signer.signTypedData(
    { name: EXTENDED_SIGNING_DOMAIN },
    {
      AccountCreation: [
        { name: 'accountIndex', type: 'int8' },
        { name: 'wallet', type: 'address' },
        { name: 'tosAccepted', type: 'bool' },
      ],
    },
    { accountIndex, wallet, tosAccepted: true },
  );
  return deriveStarkKeys(signature);
}

/** Wallet-signed headers for L1-authenticated endpoints (account list, API key management). */
async function l1Headers(signer: Signer, path: string, accountId?: number): Promise<Record<string, string>> {
  const time = isoNow();
  const signature = await signer.signMessage(`${path}@${time}`);
  return {
    [L1_SIGNATURE]: signature,
    [L1_MESSAGE_TIME]: time,
    ...(accountId !== undefined ? { [ACTIVE_ACCOUNT]: String(accountId) } : {}),
  };
}

export async function listAccounts(signer: Signer): Promise<ExtendedAccount[]> {
  const path = '/api/v1/user/accounts';
  const headers = await l1Headers(signer, path);
  const data = await extendedRequest<ExtendedAccount[]>(path, { headers });
  return Array.isArray(data) ? data : [];
}

/** Create the user's Extended account (first-time users only). */
export async function onboardAccount(signer: Signer, keys: StarkKeyPair): Promise<ExtendedAccount> {
  const wallet = await signer.getAddress();
  const time = isoNow();
  const registration = {
    accountIndex: 0,
    wallet,
    tosAccepted: true,
    time,
    action: 'REGISTER',
    host: EXTENDED_ONBOARDING_HOST,
  };
  const l1Signature = await signer.signTypedData(
    { name: EXTENDED_SIGNING_DOMAIN },
    {
      AccountRegistration: [
        { name: 'accountIndex', type: 'int8' },
        { name: 'wallet', type: 'address' },
        { name: 'tosAccepted', type: 'bool' },
        { name: 'time', type: 'string' },
        { name: 'action', type: 'string' },
        { name: 'host', type: 'string' },
      ],
    },
    registration,
  );
  const l2 = signOnboardingBinding(keys, wallet);
  const result = await extendedRequest<{ defaultAccount: ExtendedAccount }>('/auth/onboard', {
    method: 'POST',
    body: {
      l1Signature,
      l2Key: keys.publicKey,
      l2Signature: l2,
      accountCreation: registration,
    },
  });
  return result.defaultAccount;
}

export async function createApiKey(signer: Signer, account: ExtendedAccount): Promise<string> {
  const path = '/api/v1/user/account/api-key';
  const headers = await l1Headers(signer, path, account.accountId);
  const result = await extendedRequest<{ key: string }>(path, {
    method: 'POST',
    headers,
    body: { description: `ArcTerminal trading key for account ${account.accountId}` },
  });
  return result.key;
}

/** Find the account that belongs to these keys, or null if the wallet has no matching account. */
export function matchAccount(accounts: ExtendedAccount[], keys: StarkKeyPair): ExtendedAccount | null {
  return accounts.find((a) => a.accountIndex === 0 && a.l2Key && sameKey(a.l2Key, keys.publicKey)) ?? null;
}

export function hasMismatchedAccount(accounts: ExtendedAccount[], keys: StarkKeyPair): boolean {
  return accounts.some((a) => a.accountIndex === 0 && a.l2Key && !sameKey(a.l2Key, keys.publicKey));
}
