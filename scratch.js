const fs = require('fs');
let code = fs.readFileSync('src/lib/hyperliquid-kit.ts', 'utf8');

const replacement = `if (destinationChain !== 'ARB') {
          const network = await provider.getNetwork();
          const currentChainId = Number(network.chainId);
          
          let resolvedChainName = destinationChain;
          let destinationChainId = CHAIN_MAP[destinationChain];
          
          if (destinationChain === 'Auto') {
            destinationChainId = currentChainId;
            const entry = Object.entries(CHAIN_MAP).find(([name, id]) => id === currentChainId);
            resolvedChainName = entry ? entry[0] : 'Arc';
          } else if (!destinationChainId) {
            destinationChainId = 1;
          }

          if (destinationChain !== 'Auto' && currentChainId !== destinationChainId) {
            try {
              await (window as any).ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: \`0x\${destinationChainId.toString(16)}\` }],
              });
            } catch (e) {
              throw new Error(\`Please switch your wallet to \${destinationChain} to initiate the withdrawal.\`);
            }
          }

          const ROUTER_MAP: Record<string, string> = {
            'Arc': "0x68E6EF57B846CA3dBb3Aed6E8e7512BB2180C8C7",
            'Base': "0x68E6EF57B846CA3dBb3Aed6E8e7512BB2180C8C7",
            'OP': "0x68E6EF57B846CA3dBb3Aed6E8e7512BB2180C8C7",
            'ETH': "0x68E6EF57B846CA3dBb3Aed6E8e7512BB2180C8C7"
          };
          const targetRouter = ROUTER_MAP[resolvedChainName] || ROUTER_MAP['Arc'];

          const parsedAmount = ethers.parseUnits(amount.toString(), 6);
          const routerAbi = ["function withdraw(uint256 amount) external"];
          const routerContract = new ethers.Contract(targetRouter, routerAbi, await provider.getSigner());
          
          const withdrawTx = await routerContract.withdraw(parsedAmount);
          await withdrawTx.wait();

          return { success: true, message: \`Successfully withdrew \${amount} USDC from \${destinationChain} Relayer.\` };
        }`;

code = code.replace(/if \(destinationChain !== 'ARB'\) \{[\s\S]*?throw new Error\('Direct cross-chain withdrawals require a deployed relayer. Please withdraw to ARB, then use\s*the Bridge tab.'\);\s*\}/m, replacement);
fs.writeFileSync('src/lib/hyperliquid-kit.ts', code);
