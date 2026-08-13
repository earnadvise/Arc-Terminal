const fs = require('fs');

const lines = fs.readFileSync('src/components/views/BridgeView.tsx', 'utf8').split('\n');

const startIndex = lines.findIndex(line => line.includes('{/* Advanced Options Toggle */}'));
const endIndex = lines.findIndex((line, index) => index > startIndex && line.includes('</div>') && lines[index-1].includes('</AnimatePresence>'));

if (startIndex !== -1 && endIndex !== -1) {
    lines.splice(startIndex, endIndex - startIndex + 1);
    fs.writeFileSync('src/components/views/BridgeView.tsx', lines.join('\n'), 'utf8');
    console.log('Advanced Options Removed');
} else {
    console.log('Could not find Advanced Options boundaries');
}
