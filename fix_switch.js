const fs = require('fs');
let code = fs.readFileSync('src/lib/hyperliquid-kit.ts', 'utf8');

const regex = /const enableTrading = async \(\) => \{[\s\S]*?localStorage\.setItem\('hl_agent_private_key', agentWallet\.privateKey\);\n\s*setSessionKeyActive\(true\);\n\s*return \{ success: true \};\n\s*\} catch \(error: any\) \{/;

const newCode = `const enableTrading = async () => {
    setIsProcessing(true);
    try {
      if (!(window as any).ethereum) throw new Error("No crypto wallet found");
      
      const provider = new BrowserProvider((window as any).ethereum);
      
      // Force switch to Arbitrum for Hyperliquid signature
      const ARB_CHAIN_ID = 42161;
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== ARB_CHAIN_ID) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xa4b1' }], // 42161 in hex
          });
        } catch (e: any) {
          throw new Error('You must switch to Arbitrum to authorize trading on Hyperliquid.');
        }
      }

      // Re-fetch signer after potential chain switch
      const updatedProvider = new BrowserProvider((window as any).ethereum);
      const signer = await updatedProvider.getSigner();
      
      // 1. Generate Local Session Key (Agent)
      const agentWallet = ethers.Wallet.createRandom();
      
      const domain = {
        name: 'HyperliquidSignTransaction',
        version: '1',
        chainId: 42161, // MUST be Arbitrum
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
    } catch (error: any) {`;

code = code.replace(regex, newCode);
fs.writeFileSync('src/lib/hyperliquid-kit.ts', code);
