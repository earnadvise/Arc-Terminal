const fs = require('fs');
let code = fs.readFileSync('src/lib/hyperliquid-kit.ts', 'utf8');

const replacement = `  const enableTrading = async () => {
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
        chainId: 42161, // Hyperliquid L1 operates identically to Arbitrum chain ID for sigs
        verifyingContract: '0x0000000000000000000000000000000000000000'
      };

      const types = {
        Agent: [
          { name: "source", type: "string" },
          { name: "connectionId", type: "bytes32" }
        ]
      };

      const value = {
        source: "arcterminalai.xyz",
        connectionId: ethers.zeroPadValue(agentWallet.address, 32)
      };

      // 2. Prompt MetaMask to authorize the Session Key
      const signature = await signer.signTypedData(domain, types, value);
      
      // 3. Register Agent on Hyperliquid API
      const approveAgentAction = {
        action: {
          type: "approveAgent",
          hyperliquidChain: "Mainnet",
          signatureChainId: "0xa4b1",
          agentAddress: agentWallet.address,
          agentName: "ArcTerminal_Session",
          nonce: Date.now()
        },
        nonce: Date.now(),
        signature: signature
      };
      
      await fetch('https://api.hyperliquid.xyz/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(approveAgentAction)
      });

      // 4. Save Session Key locally for 1-Click Trading
      localStorage.setItem('hl_session_key_active', 'true');
      localStorage.setItem('hl_agent_private_key', agentWallet.privateKey);
      setSessionKeyActive(true);
      
      return { success: true };
    } catch (error: any) {
      console.error(error);
      return { success: false, message: error.message || 'Failed to authorize session key' };
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 3. ORDER EXECUTION WITH BUILDER FEE
   */
  const placeHyperliquidOrder = async`;

code = code.replace(/const enableTrading = async \(\) => \{[\s\S]*?\/\*\*\s*\* 3\. ORDER EXECUTION WITH BUILDER FEE\s*\*\/\s*const placeHyperliquidOrder = async/m, replacement);
fs.writeFileSync('src/lib/hyperliquid-kit.ts', code);
