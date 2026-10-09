const fs = require('fs');
let code = fs.readFileSync('src/lib/hyperliquid-kit.ts', 'utf8');
code = code.replace(/0x68E6EF57B846CA3dBb3Aed6E8e7512BB2180C8C7/g, '0x217B5d75868d975aeF6a147733c64341e0735532');
fs.writeFileSync('src/lib/hyperliquid-kit.ts', code);
