const ARC_RPC_URL = 'https://rpc.testnet.arc.network';

/**
 * Wait for a specific number of milliseconds.
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A robust wrapper around fetch for RPC calls, handling 429 Too Many Requests
 * with exponential backoff.
 */
export async function rpcFetch(method: string, params: any[] = [], maxRetries = 5): Promise<any> {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const response = await fetch(ARC_RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params,
        }),
      });

      if (response.status === 429) {
        throw new Error('RateLimit');
      }

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const data = await response.json();
      
      // If the RPC explicitly returned a rate limit error in the JSON
      if (data.error && data.error.message && data.error.message.toLowerCase().includes('limit')) {
        throw new Error('RateLimit');
      }

      return data.result;

    } catch (error: any) {
      if (error.message === 'RateLimit' || error.message.includes('429')) {
        attempt++;
        if (attempt >= maxRetries) {
          console.error(`[RPC Error] Rate limit exceeded after ${maxRetries} retries for ${method}`);
          return null;
        }
        // Exponential backoff: 0.5s, 1s, 2s, 4s...
        const backoffMs = Math.pow(2, attempt) * 500;
        console.warn(`[RPC Warn] Rate limited. Retrying ${method} in ${backoffMs}ms... (Attempt ${attempt}/${maxRetries})`);
        await sleep(backoffMs);
      } else {
        console.error(`[RPC Error] Failed to execute ${method}:`, error);
        return null; // Return null on non-rate-limit failures to fail gracefully
      }
    }
  }
  return null;
}

/**
 * Helper for read-only contract calls (eth_call).
 */
export async function rpcCall(to: string, data: string): Promise<string | null> {
  return rpcFetch('eth_call', [{ to, data }, 'latest']);
}

/**
 * Helper for checking transaction status.
 */
export async function rpcGetReceipt(txHash: string): Promise<any | null> {
  return rpcFetch('eth_getTransactionReceipt', [txHash]);
}
