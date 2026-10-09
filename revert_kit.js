const fs = require('fs');
let code = fs.readFileSync('src/lib/hyperliquid-kit.ts', 'utf8');
code = code.replace(/ethers\.parseUnits\(amount\.toString\(\), sourceChain === "Arc" \? 18 : 6\)/g, "ethers.parseUnits(amount.toString(), 6)");
code = code.replace(/ethers\.parseUnits\(amount\.toString\(\), destinationChain === "Arc" \? 18 : 6\)/g, "ethers.parseUnits(amount.toString(), 6)");
fs.writeFileSync('src/lib/hyperliquid-kit.ts', code);
