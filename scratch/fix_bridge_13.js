const fs = require('fs');
let content = fs.readFileSync('src/components/views/BridgeView.tsx', 'utf8');

const regex = /\/\/ Simulate cross-chain delay for attestation and minting[\s\S]*?refreshBalance\(\);\r?\n                    resetState\(\);\r?\n                \}, 9000\);/;

content = content.replace(regex, `
                setBridgeStatus('SUCCESS');
                
                const val = parseFloat(amount);
                setBalances(prev => ({ ...prev, USDC: Math.max(0, prev.USDC - val) }));
                
                addNotification('success', 'Bridge Complete', 'USDC successfully bridged!');
                setIsBridging(false);
                refreshBalance();
                resetState();
`);

fs.writeFileSync('src/components/views/BridgeView.tsx', content, 'utf8');
console.log('Removed fake delays');
