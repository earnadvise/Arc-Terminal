const fs = require('fs');
const content = fs.readFileSync('src/context/useAppState.tsx', 'utf-8');
const lines = content.split('\n');
console.log(lines.slice(500, 545).join('\n'));
