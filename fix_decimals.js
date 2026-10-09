const fs = require('fs');

// Fix hyperliquid-kit.ts
let hk = fs.readFileSync('src/lib/hyperliquid-kit.ts', 'utf8');
hk = hk.replace(/const parsedAmount = ethers\.parseUnits\(amount\.toString\(\), 6\);/g, "const parsedAmount = ethers.parseUnits(amount.toString(), resolvedChainName === 'Arc' ? 18 : 6);");
hk = hk.replace("resolvedChainName === 'Arc' ? 18 : 6", "sourceChain === 'Arc' || destinationChain === 'Arc' ? 18 : 6"); // handle both deposit and withdraw

// Actually, in depositToHyperliquid, sourceChain is used. In withdrawFromHyperliquid, destinationChain is used.
// Let's just do it manually.
let hk2 = fs.readFileSync('src/lib/hyperliquid-kit.ts', 'utf8');
hk2 = hk2.replace('const parsedAmount = ethers.parseUnits(amount.toString(), 6);', 'const parsedAmount = ethers.parseUnits(amount.toString(), sourceChain === "Arc" ? 18 : 6);');
hk2 = hk2.replace('const parsedAmount = ethers.parseUnits(amount.toString(), 6);', 'const parsedAmount = ethers.parseUnits(amount.toString(), destinationChain === "Arc" ? 18 : 6);');

fs.writeFileSync('src/lib/hyperliquid-kit.ts', hk2);

// Fix useAppState.tsx
let ua = fs.readFileSync('src/context/useAppState.tsx', 'utf8');
ua = ua.replace("Number(BigInt(walletBalRes)) / 1e6 : prev.walletUSDC", "Number(BigInt(walletBalRes)) / 1e18 : prev.walletUSDC");
fs.writeFileSync('src/context/useAppState.tsx', ua);
