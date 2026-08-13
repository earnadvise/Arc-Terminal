const fs = require('fs');
let content = fs.readFileSync('src/components/views/BridgeView.tsx', 'utf8');

// 1. Add imports
content = content.replace(
  /import { motion, AnimatePresence } from 'framer-motion';/,
  `import { motion, AnimatePresence } from 'framer-motion';\nimport { AppKit } from "@circle-fin/app-kit";\nimport { createEthersAdapterFromProvider } from "@circle-fin/adapter-ethers-v6";`
);

// 2. Fix the getAppKitChainName mock
content = content.replace(
  /const getAppKitChainName = \(name: string\) => name;/,
  `const getAppKitChainName = (net: string) => {
  switch(net) {
    case 'Arc Testnet': return 'Arc_Testnet';
    case 'Arbitrum Sepolia': return 'Arbitrum_Sepolia';
    case 'Base Sepolia': return 'Base_Sepolia';
    case 'Ethereum Sepolia': return 'Ethereum_Sepolia';
    case 'Optimism Sepolia': return 'Optimism_Sepolia';
    case 'Avalanche Fuji': return 'Avalanche_Fuji';
    case 'Polygon Amoy': return 'Polygon_Amoy';
    default: return net;
  }
};`
);

// 3. Remove Route Details Card
const routeDetailsRegex = /\{\/\* Route Details Card \*\/\}[\s\S]*?<\/motion\.div>/;
content = content.replace(routeDetailsRegex, '');

// 4. Update the "TO CARD" to show the amount
const toCardEmptyAmountRegex = /\{\/\* No input in TO card usually, or read-only output \*\/\}/;
content = content.replace(toCardEmptyAmountRegex, 
  `<input type="text" readOnly placeholder="0" value={amount} className="w-full min-w-0 flex-1 bg-transparent border-none px-2 py-1 text-3xl font-semibold text-right text-slate-800 outline-none placeholder:text-slate-300 ml-2" />`
);

// 5. Replace "Dummy fallback for reverse" with AppKit integration
const fallbackRegex = /\/\/ Dummy fallback for reverse[\s\S]*?resetState\(\);\r?\n/;
const appKitIntegration = `
        const adapter = await createEthersAdapterFromProvider({
            provider: eth
        });
        
        const kit = new AppKit();
        
        kit.on("*", (payload: any) => {
            if (payload.method === 'approve' && payload.values?.state !== 'success') {
                setBridgeStatus('APPROVING');
            }
            if (payload.method === 'burn') {
                setBridgeStatus('BURNING');
            }
        });

        const fromChain = getAppKitChainName(fromNet);
        const toChain = getAppKitChainName(toNet);

        let result = await kit.bridge({
            from: { adapter, chain: fromChain as any },
            to: { 
                adapter, 
                chain: toChain as any,
                useForwarder: true 
            },
            amount: amount,
        });

        if (result.state === "error") {
            result = await kit.retryBridge(result as any, {
                from: adapter,
                to: adapter,
            });
        }

        if (result.state === "success") {
            setBridgeStatus('SUCCESS');
            addNotification('success', 'Bridge Complete', 'USDC successfully bridged!');
            
            const val = parseFloat(amount);
            setBalances(prev => ({ ...prev, USDC: Math.max(0, prev.USDC - val) }));
            
            setIsBridging(false);
            refreshBalance();
            resetState();
        } else {
            throw new Error("Bridge failed on source chain.");
        }
`;

content = content.replace(fallbackRegex, appKitIntegration);

fs.writeFileSync('src/components/views/BridgeView.tsx', content, 'utf8');
console.log('Fixed BridgeView.tsx');
