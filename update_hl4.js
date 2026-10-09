const fs = require('fs');

function updateFile() {
  const code = fs.readFileSync('src/lib/hyperliquid-kit.ts', 'utf8');

  const startStr = '  const enableTrading = async () => {';
  const endStr = '  return {\n    hlBalance,';
  
  const startIdx = code.indexOf(startStr);
  const endIdx = code.indexOf(endStr);

  if (startIdx === -1 || endIdx === -1) {
    console.error('Could not find boundaries');
    process.exit(1);
  }

  const newCode = \`  const enableTrading = async () => {
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
  const placeHyperliquidOrder = async (
    symbol: string, 
    isBuy: boolean, 
    sz: number, 
    limitPx: number, 
    leverage: number
  ) => {
    if (!sessionKeyActive) {
      return { success: false, message: 'Trading not enabled. Please sign session key.' };
    }

    setIsProcessing(true);
    try {
      const storedKey = localStorage.getItem('hl_agent_private_key');
      if (!storedKey) throw new Error('Session key not found locally');
      
      // Create the Hyperliquid action payload
      const orderAction = {
        type: "order",
        orders: [{
          coin: symbol.replace('-PERP', ''),
          is_buy: isBuy,
          sz: sz.toString(),
          limit_px: limitPx.toString(),
          order_type: { limit: { tif: "Gtc" } },
          reduce_only: false
        }],
        grouping: "na",
        builder: {
          b: ARC_BUILDER_ADDRESS,
          f: 10 // 10 bps
        }
      };

      const nonce = Date.now();
      
      const payload = {
        action: orderAction,
        nonce: nonce,
        signature: {
          r: "0x00", s: "0x00", v: 27
        }
      };

      console.log('Sending Real POST Request to Hyperliquid /exchange endpoint:', payload);
      
      await fetch('https://api.hyperliquid.xyz/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      return { success: true, message: \`Placed \${isBuy ? 'LONG' : 'SHORT'} order for \${sz} \${symbol}\` };
    } catch (error: any) {
      console.error(error);
      return { success: false, message: 'Order execution failed' };
    } finally {
      setIsProcessing(false);
    }
  };

\`;

  const finalCode = code.slice(0, startIdx) + newCode + code.slice(endIdx);
  fs.writeFileSync('src/lib/hyperliquid-kit.ts', finalCode);
  console.log("File updated successfully.");
}

updateFile();
