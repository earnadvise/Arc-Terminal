const fs = require('fs');
let content = fs.readFileSync('src/components/views/BridgeView.tsx', 'utf8');

// The replacement for executeBridge
const newExecuteBridge = `  const executeBridge = async () => {
    const eth = getProvider();
    if (!walletConnected || !amount || parseFloat(amount) <= 0) return;
    
    setIsBridging(true);
    setCompletedSteps(null);

    try {
        setBridgeStatus('APPROVING');
        addNotification('info', 'Approving USDC', 'Please confirm the bridge transaction in your wallet...');
        
        const bridgingKitAddress = '0xc5567a5e3370d4dbfb0540025078e283e36a363d';
        const arcUsdcAddress = '0x3600000000000000000000000000000000000000'; 
        
        const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1e6));
        
        let destDomain = 0;
        let destChainId = 0;
        switch(toNet) {
            case 'Arbitrum Sepolia': destDomain = 3; destChainId = 421614; break;
            case 'Base Sepolia': destDomain = 6; destChainId = 84532; break;
            case 'Ethereum Sepolia': destDomain = 0; destChainId = 11155111; break;
            case 'Optimism Sepolia': destDomain = 2; destChainId = 11155420; break;
            case 'Avalanche Fuji': destDomain = 1; destChainId = 43113; break;
            case 'Polygon Amoy': destDomain = 7; destChainId = 80002; break;
            case 'Arc Testnet': destDomain = 72509; destChainId = 72542; break;
            default: destDomain = 3; destChainId = 421614;
        }
        
        let data = '0x513e1175';
        data += amountInWei.toString(16).padStart(64, '0');
        data += (72509).toString(16).padStart(64, '0');
        data += walletAddress.replace('0x', '').padStart(64, '0');
        data += arcUsdcAddress.replace('0x', '').padStart(64, '0');
        data += bridgingKitAddress.replace('0x', '').padStart(64, '0');
        data += destDomain.toString(16).padStart(64, '0');
        data += (1000).toString(16).padStart(64, '0'); 
        data += (320).toString(16).padStart(64, '0');  
        data += (12).toString(16).padStart(64, '0');   
        data += '636374702d666f72776172640000000000000000000000000000000000000000';
        
        const txHash = await eth.request({
            method: 'eth_sendTransaction',
            params: [{
                from: walletAddress,
                to: bridgingKitAddress,
                data: data
            }]
        });

        setBridgeStatus('SUCCESS');
        
        const val = parseFloat(amount);
        setBalances(prev => ({ ...prev, USDC: Math.max(0, prev.USDC - val) }));
        
        addNotification('success', 'Bridge Complete', 'USDC successfully bridged!');
        setIsBridging(false);
        refreshBalance();
        resetState();
    } catch (error: any) {
        console.error(error);
        addNotification('error', 'Transaction Failed', error.message || 'Transaction rejected by user.');
        setIsBridging(false);
        setBridgeStatus('IDLE');
    }
  };`;

const executeBridgeRegex = /  const executeBridge = async \(\) => \{[\s\S]*?    setBridgeStatus\('IDLE'\);\r?\n    \}\r?\n  \};\r?\n/;

content = content.replace(executeBridgeRegex, newExecuteBridge + '\n');

fs.writeFileSync('src/components/views/BridgeView.tsx', content, 'utf8');
console.log('Fixed executeBridge to use raw payload universally.');
