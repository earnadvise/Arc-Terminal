export const CCTP_CONSTANTS = {
  // Testnet Domain IDs
  DOMAINS: {
    ETH_SEPOLIA: 0,
    ARB_SEPOLIA: 3,
    BASE_SEPOLIA: 6,
    LINEA_SEPOLIA: 11, // Approximation for Linea
    ARC_TESTNET: 99 // Custom domain for Arc
  },
  // Testnet Contract Addresses (Sepolia equivalents)
  TOKEN_MESSENGER: {
    ETH_SEPOLIA: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
    ARB_SEPOLIA: '0x12dcfd3fe2e9eac2859fd1ed86d2ab8c5a2f9352',
    BASE_SEPOLIA: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5', // Base Sepolia
    LINEA_SEPOLIA: '0x0000000000000000000000000000000000000000', // Pending deployment
    ARC_TESTNET: '0x0000000000000000000000000000000000000000'
  },
  MESSAGE_TRANSMITTER: {
    ETH_SEPOLIA: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
    ARB_SEPOLIA: '0xaCF1ceeF359C4bfc6AB1C022Cb4728A16c50af73',
    BASE_SEPOLIA: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
    LINEA_SEPOLIA: '0x0000000000000000000000000000000000000000',
    ARC_TESTNET: '0x0000000000000000000000000000000000000000'
  }
};

/**
 * Helper to fetch a CCTP attestation signature from Circle's Iris API
 * @param messageHash - The keccak256 hash of the message bytes emitted by MessageSent
 * @returns The signature bytes needed to mint on the destination chain
 */
export async function fetchCCTPAttestation(messageHash: string): Promise<string> {
  const IRIS_API = 'https://iris-api-sandbox.circle.com/v1/attestations';
  
  // We poll because the attestation isn't available immediately (usually takes 1-3 minutes depending on chain finality)
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${IRIS_API}/${messageHash}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'complete' && data.attestation) {
          return data.attestation;
        }
      }
    } catch (err) {
      console.warn('CCTP Attestation poll error:', err);
    }
    // Wait 5 seconds before checking again
    await new Promise(r => setTimeout(r, 5000));
  }
  
  throw new Error('CCTP Attestation timeout');
}
