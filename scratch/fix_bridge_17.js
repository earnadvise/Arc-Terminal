const fs = require('fs');
let content = fs.readFileSync('src/components/views/BridgeView.tsx', 'utf8');

const regexToRemove = /          \{bridgeStatus === 'SUCCESS' && \([\s\S]*?           <\/div>\r?\n          \)\}\r?\n\r?\n/;

content = content.replace(regexToRemove, '');

fs.writeFileSync('src/components/views/BridgeView.tsx', content, 'utf8');
console.log('Banner removed.');
