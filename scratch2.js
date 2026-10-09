const fs = require('fs');
let code = fs.readFileSync('src/lib/hyperliquid-kit.ts', 'utf8');

const regex = /    const withdrawFromHyperliquid = async \((.*?)\) => \{[\s\S]*?setIsProcessing\(true\);[\s\S]*?try \{/;

const replacement = `    const withdrawFromHyperliquid = async (amount: number, destinationChain: string) => {
      setIsProcessing(true);
      try {
        const provider = new BrowserProvider((window as any).ethereum);`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/lib/hyperliquid-kit.ts', code);
