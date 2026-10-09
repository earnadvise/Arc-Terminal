const fs = require('fs');

const kitContent = `import { ethers } from 'ethers';

// --- MOCK HYPERLIQUID KIT ---
// Rolled back to simulated timeouts as requested

export const depositToHyperliquid = async (amount: string, sourceChain: string = 'Arbitrum') => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ 
        success: true, 
        message: \`Successfully deposited \${amount} USDC from \${sourceChain}.\` 
      });
    }, 2000); // 2 second mock delay
  });
};

export const withdrawFromHyperliquid = async (amount: string, destinationChain: string = 'Arbitrum') => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ 
        success: true, 
        message: \`Successfully withdrew \${amount} USDC to \${destinationChain}.\` 
      });
    }, 2000); // 2 second mock delay
  });
};
`;

fs.writeFileSync('src/lib/hyperliquid-kit.ts', kitContent);
