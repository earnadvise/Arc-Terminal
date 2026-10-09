const fs = require('fs');
let code = fs.readFileSync('src/lib/hyperliquid-kit.ts', 'utf8');

const replacement = `      const targetRouter = ROUTER_MAP['Arc'];
      const routerAbi = ["function userMargin(address) view returns (uint256)"];
      const routerContract = new ethers.Contract(targetRouter, routerAbi, new ethers.JsonRpcProvider('https://rpc.mainnet.arc.io'));
      const marginStr = await routerContract.userMargin(userAddress);
      setHlBalance(Number(ethers.formatUnits(marginStr, 6)));`;

code = code.replace(/const res = await fetch\([\s\S]*?setHlBalance\(margin\);\n\s*\}/, replacement);
fs.writeFileSync('src/lib/hyperliquid-kit.ts', code);
