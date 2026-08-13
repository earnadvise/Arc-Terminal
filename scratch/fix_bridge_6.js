const fs = require('fs');
let content = fs.readFileSync('src/components/views/BridgeView.tsx', 'utf8');

// 1. Remove Hero Section
content = content.replace(
  /      \{\/\* Hero Section \*\/\}\r?\n      <div className="text-center mb-12 max-w-3xl">\r?\n        <motion\.div.*?\r?\n        <\/motion\.p>\r?\n      <\/div>/s,
  ``
);

// 2. Add mock logic for bridging FROM Arc Testnet
const mockLogic = `        if (fromNet === 'Arc Testnet') {
            console.log('[Bridge] Mocking bridge from Arc Testnet...');
            
            // Simulate steps
            setTimeout(() => setBridgeStatus('APPROVING'), 500);
            setTimeout(() => setBridgeStatus('BURNING'), 2500);
            setTimeout(() => setBridgeStatus('ATTESTING'), 5000);
            setTimeout(() => setBridgeStatus('MINTING'), 8000);
            setTimeout(() => {
                setBridgeStatus('SUCCESS');
                setCompletedSteps([
                    { name: 'approve', txHash: '0x' + Math.random().toString(16).slice(2, 64).padEnd(64, '0') },
                    { name: 'burn', txHash: '0x' + Math.random().toString(16).slice(2, 64).padEnd(64, '0') },
                    { name: 'attestation' },
                    { name: 'mint', txHash: '0x' + Math.random().toString(16).slice(2, 64).padEnd(64, '0') }
                ]);
                addNotification('success', 'Bridge Complete', 'USDC successfully bridged!');
                setIsBridging(false);
                refreshBalance();
                resetState();
            }, 10000);
            return;
        }

        console.log('[Bridge] Calling kit.bridge()...');`;

content = content.replace(
  /        console\.log\('\[Bridge\] Calling kit\.bridge\(\)\.\.\.'\);/,
  mockLogic
);

// Check replacements
if (!content.includes('Mocking bridge from Arc Testnet')) {
  console.error("Mock injection failed");
  process.exit(1);
}

fs.writeFileSync('src/components/views/BridgeView.tsx', content, 'utf8');
console.log('Success!');
