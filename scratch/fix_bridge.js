const fs = require('fs');

let content = fs.readFileSync('src/components/views/BridgeView.tsx', 'utf8');

// 1. Replace State
content = content.replace(
  `  const [sourceChain, setSourceChain] = useState<'Arbitrum Sepolia' | 'Base Sepolia' | 'Ethereum Sepolia' | 'Optimism Sepolia' | 'Avalanche Fuji' | 'Polygon Amoy'>('Arbitrum Sepolia');\n  const [isDirectionReversed, setIsDirectionReversed] = useState(false);`,
  `  const [fromNet, setFromNet] = useState<string>('Arc Testnet');\n  const [toNet, setToNet] = useState<string>('Arbitrum Sepolia');`
);

// 2. Fix useEffect for balance fetching
content = content.replace(
  `switch(sourceChain) {`,
  `const nonArcChain = fromNet === 'Arc Testnet' ? toNet : fromNet;\n    switch(nonArcChain) {`
);

content = content.replace(
  `}, [sourceChain, walletAddress, fetchTrigger]);`,
  `}, [fromNet, toNet, walletAddress, fetchTrigger]);`
);

// 3. Remove fromNet, toNet, currentBalance logic
content = content.replace(
  `  const fromNet = isDirectionReversed ? 'Arc Testnet' : sourceChain;\n  const toNet = isDirectionReversed ? sourceChain : 'Arc Testnet';\n  const currentBalance = isDirectionReversed ? balances.USDC : externalBalance;`,
  `  const currentBalance = fromNet === 'Arc Testnet' ? balances.USDC : externalBalance;`
);

// 4. Update reverseDirection
content = content.replace(
  `  const reverseDirection = () => {\n    setIsDirectionReversed(!isDirectionReversed);\n  };`,
  `  const reverseDirection = () => {\n    const temp = fromNet;\n    setFromNet(toNet);\n    setToNet(temp);\n  };`
);

// 5. Update UI for 'From' block
const fromUI = `
          <div className="mb-4">
            <div className="relative border border-slate-100 rounded-2xl bg-white hover:bg-slate-50 transition-colors">
              <select
                value={fromNet}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === toNet) setToNet(fromNet);
                  setFromNet(val);
                }}
                className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none cursor-pointer appearance-none px-4 py-3 relative z-10"
              >
                <option value="Arc Testnet">Arc Testnet</option>
                <option value="Arbitrum Sepolia">Arbitrum Sepolia</option>
                <option value="Base Sepolia">Base Sepolia</option>
                <option value="Ethereum Sepolia">Ethereum Sepolia</option>
                <option value="Optimism Sepolia">Optimism Sepolia</option>
                <option value="Avalanche Fuji">Avalanche Fuji</option>
                <option value="Polygon Amoy">Polygon Amoy</option>
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-0" />
            </div>
          </div>
`;

content = content.replace(
  /<div className="mb-4">\s*\{isDirectionReversed \? \([\s\S]*?\) : \([\s\S]*?\}\s*<\/div>/m,
  fromUI.trim()
);

// 6. Update UI for 'To' block
const toUI = `
          <div className="mb-4">
            <div className="relative border border-slate-100 rounded-2xl bg-white hover:bg-slate-50 transition-colors">
              <select
                value={toNet}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === fromNet) setFromNet(toNet);
                  setToNet(val);
                }}
                className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none cursor-pointer appearance-none px-4 py-3 relative z-10"
              >
                <option value="Arc Testnet">Arc Testnet</option>
                <option value="Arbitrum Sepolia">Arbitrum Sepolia</option>
                <option value="Base Sepolia">Base Sepolia</option>
                <option value="Ethereum Sepolia">Ethereum Sepolia</option>
                <option value="Optimism Sepolia">Optimism Sepolia</option>
                <option value="Avalanche Fuji">Avalanche Fuji</option>
                <option value="Polygon Amoy">Polygon Amoy</option>
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-0" />
            </div>
          </div>
`;

content = content.replace(
  /<div className="mb-4">\s*\{\!isDirectionReversed \? \([\s\S]*?\) : \([\s\S]*?\}\s*<\/div>/m,
  toUI.trim()
);

// 7. Update success block external balance logic
content = content.replace(
  `            if (isDirectionReversed) {\n               setBalances(prev => ({ ...prev, USDC: Math.max(0, prev.USDC - val) }));\n               setExternalBalance(prev => prev + val);\n            } else {\n               setBalances(prev => ({ ...prev, USDC: prev.USDC + val }));\n               setExternalBalance(prev => Math.max(0, prev - val));\n            }`,
  `            if (fromNet === 'Arc Testnet') {\n               setBalances(prev => ({ ...prev, USDC: Math.max(0, prev.USDC - val) }));\n               setExternalBalance(prev => prev + val);\n            } else {\n               setBalances(prev => ({ ...prev, USDC: prev.USDC + val }));\n               setExternalBalance(prev => Math.max(0, prev - val));\n            }`
);

// 8. Fix layout sizes (decrease gap and paddings to make it less big)
content = content.replace(`className="relative z-10 w-full max-w-[480px] bg-white rounded-[2rem] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-slate-100 flex flex-col gap-6"`, `className="relative z-10 w-full max-w-[480px] bg-white rounded-[2rem] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-slate-100 flex flex-col gap-4"`);

content = content.replace(`className="bg-white border border-slate-200 rounded-[1.5rem] p-4 mb-2 shadow-sm"`, `className="bg-white border border-slate-200 rounded-[1.25rem] p-4 shadow-sm"`);
content = content.replace(`className="bg-white border border-slate-200 rounded-[1.5rem] p-4 shadow-sm"`, `className="bg-white border border-slate-200 rounded-[1.25rem] p-4 shadow-sm"`);

fs.writeFileSync('src/components/views/BridgeView.tsx', content, 'utf8');
console.log('Done!');
