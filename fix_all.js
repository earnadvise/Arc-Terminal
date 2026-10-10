const fs = require('fs');
let code = fs.readFileSync('src/components/views/PerpetualsView.tsx', 'utf8');

const regex = /const handlePlaceOrder = async \(\) => \{[\s\S]*?\};\n/m;
const newCode = `const handlePlaceOrder = async () => {
    // Route orders directly to ArcPerpRouter on Arc Mainnet
    await placeOrder(tradeSide, orderType.toUpperCase() as 'MARKET' | 'LIMIT' | 'STOP', parsedPrice, parsedSize);
  };\n`;

code = code.replace(regex, newCode);
fs.writeFileSync('src/components/views/PerpetualsView.tsx', code);

let circleKit = fs.readFileSync('src/lib/circle-unified-balance-kit.tsx', 'utf8');
circleKit = circleKit.replace('https://cloudflare-eth.com', 'https://eth.llamarpc.com');
circleKit = circleKit.replace('https://polygon-rpc.com', 'https://polygon.llamarpc.com');
fs.writeFileSync('src/lib/circle-unified-balance-kit.tsx', circleKit);
