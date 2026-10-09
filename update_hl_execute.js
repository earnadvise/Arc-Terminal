const fs = require('fs');
let code = fs.readFileSync('src/lib/hyperliquid-kit.ts', 'utf8');

const regex = /const placeHyperliquidOrder = async \([\s\S]*?\) => {[\s\S]*?setIsProcessing\(true\);[\s\S]*?try {[\s\S]*?const storedKey = localStorage\.getItem\('hl_agent_private_key'\);[\s\S]*?\} finally \{\s*setIsProcessing\(false\);\s*\}\s*\};/m;

const newCode = `const placeHyperliquidOrder = async (
    symbol: string, 
    isBuy: boolean, 
    sz: number, 
    limitPx: number, 
    leverage: number
  ) => {
    if (!sessionKeyActive) {
      return { success: false, message: 'Trading not enabled. Please sign session key.' };
    }

    setIsProcessing(true);
    try {
      const storedKey = localStorage.getItem('hl_agent_private_key');
      if (!storedKey) throw new Error('Session key not found locally');
      
      const hl = new Hyperliquid({ privateKey: storedKey, testnet: false, enableWs: false });
      
      const builder = ARC_BUILDER_ADDRESS.toLowerCase();
      
      const res = await hl.exchange.placeOrder({
        orders: [{
          coin: symbol.replace('-PERP', ''),
          is_buy: isBuy,
          sz: sz,
          limit_px: limitPx,
          order_type: { limit: { tif: "Gtc" } },
          reduce_only: false
        }],
        grouping: "na",
        builder: builder.includes('arcfee') ? undefined : {
          b: builder,
          f: 10 // 10 bps
        }
      });

      console.log('Real Order Execution Response:', res);
      
      if (res.status === 'ok') {
          return { success: true, message: \`Placed \${isBuy ? 'LONG' : 'SHORT'} order for \${sz} \${symbol}\` };
      } else {
          return { success: false, message: res.response?.data?.statuses?.[0]?.error || 'Order rejected by Hyperliquid' };
      }
    } catch (error: any) {
      console.error('Order Error:', error);
      return { success: false, message: error.message || 'Order execution failed' };
    } finally {
      setIsProcessing(false);
    }
  };`;

code = code.replace(regex, newCode);
fs.writeFileSync('src/lib/hyperliquid-kit.ts', code);
