const fs = require('fs');
let content = fs.readFileSync('src/components/views/BridgeView.tsx', 'utf8');

const regexToRemove = /<div className="flex flex-col gap-2\.5 mt-4 pt-4 border-t border-\[#0052FF\]\/10">[\s\S]*?<\/div>\r?\n          <\/div>\r?\n        \)\}/;

content = content.replace(
  regexToRemove,
  '          </div>\n        )}'
);

fs.writeFileSync('src/components/views/BridgeView.tsx', content, 'utf8');
console.log('Removed completed steps rendering');
