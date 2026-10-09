const fs = require('fs');
let code = fs.readFileSync('src/lib/hyperliquid-kit.ts', 'utf8');

const regex = /const enableTrading = async \(\) => \{[\s\S]*?localStorage\.setItem\('hl_agent_private_key', agentWallet\.privateKey\);\n\s*setSessionKeyActive\(true\);\n\s*return \{ success: true \};\n\s*\} catch \(error: any\) \{/;

const newCode = `const enableTrading = async () => {
    setIsProcessing(true);
    try {
      if (!(window as any).ethereum) throw new Error("No crypto wallet found");
      
      const provider = new BrowserProvider((window as any).ethereum);
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      const signer = await provider.getSigner();
      
      // 1. Generate Local Session Key (Agent)
      const agentWallet = ethers.Wallet.createRandom();
      
      const domain = {
        name: 'HyperliquidSignTransaction',
        version: '1',
        chainId: currentChainId, // Use the user's CURRENT chain ID
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
          signatureChainId: "0x" + currentChainId.toString(16) // Pass the hex chainId to Hyperliquid
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
    } catch (error: any) {`;

code = code.replace(regex, newCode);
fs.writeFileSync('src/lib/hyperliquid-kit.ts', code);
