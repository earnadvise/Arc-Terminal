const fs = require('fs');
let content = fs.readFileSync('src/components/views/BridgeView.tsx', 'utf8');

// Remove the Last updated pill
const updatePillRegex = /            <div className="flex items-center gap-2 text-\[11px\] font-medium text-slate-400">[\s\S]*?<\/div>/;
content = content.replace(updatePillRegex, '');

fs.writeFileSync('src/components/views/BridgeView.tsx', content, 'utf8');
console.log('Removed update pill.');
