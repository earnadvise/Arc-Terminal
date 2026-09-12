const fs = require('fs');
const content = fs.readFileSync('src/components/views/LandingView.tsx', 'utf-8');
const lines = content.split('\n');
console.log(lines.slice(60, 80).join('\n'));
