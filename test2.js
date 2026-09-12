const fs = require('fs');
const content = fs.readFileSync('src/context/useAppState.tsx', 'utf-8');
const match = content.match(/ArcPerpVault[\s\S]{1,500}/);
if (match) console.log(match[0]);
