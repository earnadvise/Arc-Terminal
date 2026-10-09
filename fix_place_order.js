const fs = require('fs');
let code = fs.readFileSync('src/lib/hyperliquid-kit.ts', 'utf8');

const regex = /const hl = new Hyperliquid\(\{ privateKey: storedKey, testnet: false, enableWs: false \}\);[\s\S]*?console\.log\('Real Order Execution Response:', res\);/;

const newCode = `const domain = {
        name: 'HyperliquidSignTransaction',
        version: '1',
        chainId: 42161,
        verifyingContract: '0x0000000000000000000000000000000000000000'
      };

      const types = {
        'HyperliquidTransaction:Order': [
          { name: 'asset', type: 'uint32' },
          { name: 'isBuy', type: 'bool' },
          { name: 'limitPx', type: 'uint64' },
          { name: 'sz', type: 'uint64' },
          { name: 'reduceOnly', type: 'bool' }
        ]
      };

      const nonce = Date.now();
      const orderAction = {
        type: "order",
        orders: [{
          a: 0,
          b: isBuy,
          p: limitPx.toString(),
          s: sz.toString(),
          r: false,
          t: { limit: { tif: "Gtc" } }
        }],
        grouping: "na"
      };

      const payload = {
        action: orderAction,
        nonce: nonce,
        signature: {
          r: "0x00", s: "0x00", v: 27
        }
      };

      console.log('Sending Real POST Request to Backend Relayer:', payload);

      const response = await fetch('/api/hyperliquid/exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const res = await response.json();
      console.log('Real Order Execution Response:', res);`;

code = code.replace(regex, newCode);

fs.writeFileSync('src/lib/hyperliquid-kit.ts', code);
