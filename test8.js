const fs = require('fs');
const content = fs.readFileSync('src/app/page.tsx', 'utf-8');
const lines = content.split('\n');
lines.forEach((l, i) => {
   if (l.toLowerCase().includes('trade with arc ai')) {
       console.log(`${i+1}: ${l}`);
   }
});
