const fs = require('fs');
let code = fs.readFileSync('src/lib/hyperliquid-kit.ts', 'utf8');

const startIndex = code.indexOf('const enableTrading = async () => {');
const endIndex = code.indexOf('} catch (error: any) {', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const newCode = `const enableTrading = async () => {
    setIsProcessing(true);
    try {
      if (!(window as any).ethereum) throw new Error("No crypto wallet found");
      
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      // 1. Generate Local Session Key (Agent)
      const agentWallet = ethers.Wallet.createRandom();
      
      const domain = {
        name: 'HyperliquidSignTransaction',
        version: '1',
        chainId: 42161, // Hyperliquid L1 Arbitrum chain ID
        verifyingContract: '0x0000000000000000000000000000000000000000'
      };

      const types = {
        'HyperliquidTransaction:ApproveAgent': [
          { name: 'hyperliquidChain', type: 'string' },
          { name: 'agentAddress', type: 'address' },
          { name: 'agentName', type: 'string' },
          { name: 'nonce', type: 'uint64' },
        ]
      };

      const nonce = Date.now();
      const action = {
        hyperliquidChain: 'Mainnet',
        agentAddress: agentWallet.address,
        agentName: 'ArcTerminal_Session',
        nonce: nonce
      };

      // 2. Prompt MetaMask to authorize the Session Key
      const rawSignature = await signer.signTypedData(domain, types, action);
      
      const { r, s, v } = ethers.Signature.from(rawSignature);

      // 3. Register Agent on Hyperliquid API
      const approveAgentAction = {
        action: {
          type: "approveAgent",
          ...action,
          signatureChainId: "0xa4b1"
        },
        nonce: nonce,
        signature: { r, s, v }
      };
      
      const res = await fetch('https://api.hyperliquid.xyz/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(approveAgentAction)
      });

      const responseData = await res.json();
      console.log('ApproveAgent Response:', responseData);
      
      if (responseData.status !== 'ok') {
        throw new Error(responseData.response?.data?.statuses?.[0]?.error || 'Failed to authorize agent on Hyperliquid');
      }

      // 4. Save Session Key locally for 1-Click Trading
      localStorage.setItem('hl_session_key_active', 'true');
      localStorage.setItem('hl_agent_private_key', agentWallet.privateKey);
      setSessionKeyActive(true);
      
      return { success: true };
    `;
  
  code = code.substring(0, startIndex) + newCode + code.substring(endIndex);
  fs.writeFileSync('src/lib/hyperliquid-kit.ts', code);
  console.log("SUCCESS");
} else {
  console.log("FAIL: ", startIndex, endIndex);
}
