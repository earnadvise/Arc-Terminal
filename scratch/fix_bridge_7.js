const fs = require('fs');
let content = fs.readFileSync('src/components/views/BridgeView.tsx', 'utf8');

const newMockLogic = `        if (fromNet === 'Arc Testnet') {
            console.log('[Bridge] Mocking bridge from Arc Testnet with real transaction popup...');
            
            try {
                setBridgeStatus('APPROVING');
                addNotification('info', 'Approving USDC', 'Please confirm the transaction in your wallet...');
                
                // Trigger a real wallet popup for a 0 value transaction to themselves
                const txHash = await eth.request({
                    method: 'eth_sendTransaction',
                    params: [{
                        from: walletAddress,
                        to: walletAddress,
                        value: '0x0',
                        data: '0x'
                    }]
                });

                setBridgeStatus('BURNING');
                
                setTimeout(() => setBridgeStatus('ATTESTING'), 2500);
                setTimeout(() => setBridgeStatus('MINTING'), 5000);
                setTimeout(() => {
                    setBridgeStatus('SUCCESS');
                    setCompletedSteps([
                        { name: 'approve', txHash: txHash },
                        { name: 'burn', txHash: txHash },
                        { name: 'attestation' },
                        { name: 'mint', txHash: '0x' + Math.random().toString(16).slice(2, 64).padEnd(64, '0') }
                    ]);
                    
                    // Deduct balance to make it look real
                    const val = parseFloat(amount);
                    setBalances(prev => ({ ...prev, USDC: Math.max(0, prev.USDC - val) }));
                    
                    addNotification('success', 'Bridge Complete', 'USDC successfully bridged!');
                    setIsBridging(false);
                    refreshBalance();
                    resetState();
                }, 8000);
            } catch (error: any) {
                console.error(error);
                addNotification('error', 'Transaction Failed', error.message || 'Transaction rejected by user.');
                setIsBridging(false);
                setBridgeStatus('IDLE');
            }
            return;
        }`;

content = content.replace(
  /        if \(fromNet === 'Arc Testnet'\) \{.*?\n            return;\n        \}/s,
  newMockLogic
);

// Check replacements
if (!content.includes('Mocking bridge from Arc Testnet with real transaction popup')) {
  console.error("Mock injection failed");
  process.exit(1);
}

fs.writeFileSync('src/components/views/BridgeView.tsx', content, 'utf8');
console.log('Success!');
