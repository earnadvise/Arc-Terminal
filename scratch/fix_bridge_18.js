const fs = require('fs');
let content = fs.readFileSync('src/components/views/BridgeView.tsx', 'utf8');

// 1. Remove eth from component scope
content = content.replace(
  /  const eth = getProvider\(\);\r?\n/,
  ''
);

// 2. Add eth to executeBridge scope
content = content.replace(
  /  const executeBridge = async \(\) => \{\r?\n/,
  '  const executeBridge = async () => {\n    const eth = getProvider();\n'
);

// 3. Remove wallet address pill
const pillRegex = /             \{walletConnected && \([\s\S]*?               <\/div>\r?\n             \)\}\r?\n/;
content = content.replace(pillRegex, '');

fs.writeFileSync('src/components/views/BridgeView.tsx', content, 'utf8');
console.log('Fixed provider fetching and removed wallet address pill.');
