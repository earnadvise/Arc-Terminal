const fs = require('fs');

// Patch useAppState.tsx
let code = fs.readFileSync('src/context/useAppState.tsx', 'utf8');

const regex3 = /const isPartial = actualCloseSize < pos\.size;/;
const newCode3 = `const isPartial = actualCloseSize < pos.size;
      window.dispatchEvent(new CustomEvent('mock_pnl_settled', { detail: realizedPnl }));`;
code = code.replace(regex3, newCode3);
fs.writeFileSync('src/context/useAppState.tsx', code);

// Patch hyperliquid-kit.ts
let hlCode = fs.readFileSync('src/lib/hyperliquid-kit.ts', 'utf8');

const hlRegex = /const fetchRealBalance = useCallback\(async \(userAddress: string\) => \{/g;
const hlNew = `const [mockPnlAccumulator, setMockPnlAccumulator] = useState(0);
    
    useEffect(() => {
      const handler = (e) => setMockPnlAccumulator(prev => prev + e.detail);
      window.addEventListener('mock_pnl_settled', handler);
      return () => window.removeEventListener('mock_pnl_settled', handler);
    }, []);

    const fetchRealBalance = useCallback(async (userAddress: string) => {`;
hlCode = hlCode.replace(hlRegex, hlNew);

const setRegex = /setHlBalance\(Number\(ethers\.formatUnits\(marginStr, 6\)\)\);/g;
const setNew = `setHlBalance(Number(ethers.formatUnits(marginStr, 6)) + window.mockPnlAccumulatorHack);`;

// Wait, the state might be stale inside fetchRealBalance since it's a callback!
// I'll just use a global variable to keep it simple.
hlCode = hlCode.replace(hlNew, `
    useEffect(() => {
      if (typeof window !== 'undefined') window.mockPnlAccumulatorHack = window.mockPnlAccumulatorHack || 0;
      const handler = (e) => { window.mockPnlAccumulatorHack += e.detail; };
      window.addEventListener('mock_pnl_settled', handler);
      return () => window.removeEventListener('mock_pnl_settled', handler);
    }, []);
    const fetchRealBalance = useCallback(async (userAddress: string) => {`);

hlCode = hlCode.replace(/setHlBalance\(Number\(ethers\.formatUnits\(marginStr, 6\)\)\);/g, `setHlBalance(Number(ethers.formatUnits(marginStr, 6)) + (window.mockPnlAccumulatorHack || 0));`);

fs.writeFileSync('src/lib/hyperliquid-kit.ts', hlCode);
