import {
  ethSigToPrivate,
  getStarkKey,
  pedersen,
  poseidonHashMany,
  sign as starkSign,
} from '@scure/starknet';

// Pure-JS Stark primitives for Extended. No WASM, so it bundles in any browser build.
// Selectors and hash layout follow the StarkWare perpetual SNIP-12 spec and are checked
// byte-for-byte against Extended's official test vector and SDK output.

const FIELD_PRIME = BigInt('0x800000000000011000000000000000000000000000000000000000000000001');
const DOMAIN_SELECTOR = BigInt('0x1ff2f602e42168014d405a94f75e8a93d640751d71d16311266e140d8b0a210');
const ORDER_SELECTOR = BigInt('0x36da8d51815527cabfaa9c982f564c80fa7429616739306036f1f9b608dd112');
const WITHDRAWAL_SELECTOR = BigInt('0x250a5fa378e8b771654bd43dcb34844534f9d1e29e16b14760d7936ea7f4b1d');

export interface StarknetDomain {
  name: string;
  version: string;
  chainId: string;
  revision: string;
}

export interface OrderHashInput {
  positionId: number | string;
  baseAssetId: string;
  baseAmount: string;
  quoteAssetId: string;
  quoteAmount: string;
  feeAssetId: string;
  feeAmount: string;
  expiration: number | string;
  salt: number | string;
  userPublicKey: string;
  domain: StarknetDomain;
}

export interface StarkKeyPair {
  privateKey: string;
  publicKey: string;
}

const toFelt = (value: bigint | number | string): bigint => {
  const v = BigInt(value);
  return ((v % FIELD_PRIME) + FIELD_PRIME) % FIELD_PRIME;
};

const shortString = (text: string): bigint => {
  const bytes = new TextEncoder().encode(text);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return BigInt('0x' + (hex || '0'));
};

const hex = (value: bigint): string => '0x' + value.toString(16);

export function domainHash(domain: StarknetDomain): bigint {
  return poseidonHashMany([
    DOMAIN_SELECTOR,
    shortString(domain.name),
    shortString(domain.version),
    shortString(domain.chainId),
    BigInt(domain.revision),
  ]);
}

export function orderMessageHash(input: OrderHashInput): bigint {
  const orderHash = poseidonHashMany([
    ORDER_SELECTOR,
    toFelt(input.positionId),
    toFelt(input.baseAssetId),
    toFelt(input.baseAmount),
    toFelt(input.quoteAssetId),
    toFelt(input.quoteAmount),
    toFelt(input.feeAssetId),
    toFelt(input.feeAmount),
    toFelt(input.expiration),
    toFelt(input.salt),
  ]);
  return poseidonHashMany([
    shortString('StarkNet Message'),
    domainHash(input.domain),
    toFelt(input.userPublicKey),
    orderHash,
  ]);
}

export interface WithdrawalHashInput {
  recipient: string;
  positionId: number | string;
  collateralId: string;
  amount: string;
  expiration: number | string;
  salt: number | string;
  userPublicKey: string;
  domain: StarknetDomain;
}

/** Hash of the signed withdrawal request (Extended "WithdrawArgs" struct). */
export function withdrawalMessageHash(input: WithdrawalHashInput): bigint {
  const structHash = poseidonHashMany([
    WITHDRAWAL_SELECTOR,
    toFelt(input.recipient),
    toFelt(input.positionId),
    toFelt(input.collateralId),
    toFelt(input.amount),
    toFelt(input.expiration),
    toFelt(input.salt),
  ]);
  return poseidonHashMany([
    shortString('StarkNet Message'),
    domainHash(input.domain),
    toFelt(input.userPublicKey),
    structHash,
  ]);
}

/** Derive the Stark key pair from the wallet's EIP-712 AccountCreation signature. */
export function deriveStarkKeys(ethSignature: string): StarkKeyPair {
  const priv = ethSigToPrivate(ethSignature);
  const privateKey = priv.startsWith('0x') ? priv : '0x' + priv;
  return { privateKey, publicKey: getStarkKey(privateKey) };
}

export function signHash(privateKey: string, messageHash: bigint): { r: string; s: string } {
  const sig = starkSign(hex(messageHash), privateKey);
  return { r: hex(sig.r), s: hex(sig.s) };
}

/** pedersen(l1Address, l2PublicKey), signed by the L2 key. Proves key ownership at onboarding. */
export function signOnboardingBinding(keys: StarkKeyPair, l1Address: string): { r: string; s: string } {
  const message = pedersen(BigInt(l1Address), BigInt(keys.publicKey));
  return signHash(keys.privateKey, BigInt(message));
}
