export const CCTP_CONSTANTS = {
  // Example CCTP Contracts for Testnet (Ethereum Sepolia -> Arbitrum Sepolia -> Arc Testnet)
  TOKEN_MESSENGER: {
    SEPOLIA: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
    ARBITRUM_SEPOLIA: '0x12dcfd3fe2e9eac2859fd1ed86d2ab8c5a2f9352',
    ARC_TESTNET: '0x0000000000000000000000000000000000000000' // Placeholder
  },
  MESSAGE_TRANSMITTER: {
    SEPOLIA: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
    ARBITRUM_SEPOLIA: '0xaCF1ceeF359C4bfc6AB1C022Cb4728A16c50af73',
    ARC_TESTNET: '0x0000000000000000000000000000000000000000' // Placeholder
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
