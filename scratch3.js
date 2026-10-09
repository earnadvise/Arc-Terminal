const fs = require('fs');
let code = fs.readFileSync('src/lib/hyperliquid-kit.ts', 'utf8');

const regex = /          const routerAbi = \["function deposit\(uint256 amount\) external"\];/;

const replacement = `          const testAbi = ["function marginToken() view returns (address)"];
          const testContract = new ethers.Contract(targetRouter, testAbi, provider);
          try {
            const theMarginToken = await testContract.marginToken();
            if (theMarginToken.toLowerCase() !== targetUSDC.toLowerCase()) {
              throw new Error(\`ROUTER MISMATCH! Your ArcPerpRouter (\${targetRouter}) was deployed expecting \${theMarginToken}, but you are trying to deposit \${targetUSDC}. Re-deploy the router with the correct USDC address!\`);
            }
          } catch(e) {
            if (e.message.includes('ROUTER MISMATCH')) throw e;
          }
          const routerAbi = ["function deposit(uint256 amount) external"];`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/lib/hyperliquid-kit.ts', code);
