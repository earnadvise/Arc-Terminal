const fs = require('fs');
const content = fs.readFileSync('src/context/useAppState.tsx', 'utf-8');
const match = content.match(/const DEFAULT_PAIRS[\s\S]*?\];/);
if (match) console.log(match[0]);
