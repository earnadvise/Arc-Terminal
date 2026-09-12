const fs = require('fs');
const content = fs.readFileSync('src/context/useAppState.tsx', 'utf-8');
const lines = content.split('\n');
lines.forEach((l, i) => {
   if (l.includes('takeProfit')) {
       console.log(`${i+1}: ${l}`);
   }
});
