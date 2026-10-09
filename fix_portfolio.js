const fs = require('fs');
let code = fs.readFileSync('src/components/views/PortfolioView.tsx', 'utf8');

code = code.replace(/const { hlBalance } = require\("..\/..\/lib\/hyperliquid-kit"\).useHyperliquid\(\);/, 'const { hlBalance } = useHyperliquid();');

if (!code.includes('import { useHyperliquid }')) {
  code = code.replace(
    `import { useUnifiedBalance } from '@/lib/circle-unified-balance-kit';`,
    `import { useUnifiedBalance } from '@/lib/circle-unified-balance-kit';\nimport { useHyperliquid } from '@/lib/hyperliquid-kit';`
  );
}

fs.writeFileSync('src/components/views/PortfolioView.tsx', code);
