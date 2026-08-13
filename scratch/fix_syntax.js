const fs = require('fs');
let c = fs.readFileSync('src/components/views/BridgeView.tsx', 'utf8');
c = c.replace(/\\`/g, '`');
fs.writeFileSync('src/components/views/BridgeView.tsx', c);
console.log('Fixed backticks.');
