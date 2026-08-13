const fs = require('fs');
let content = fs.readFileSync('src/components/views/BridgeView.tsx', 'utf8');

// The advanced options section typically looks something like:
// {/* Advanced Options */}
// <div className="...">
//   <button ...> Advanced Options ... </button>
//   {showAdvanced && ( ... )}
// </div>

content = content.replace(
  /\{\/\* Advanced Options \*\/\}\r?\n        <div className="bg-white border border-slate-200 rounded-\[1\.25rem\] p-4 mb-6 shadow-sm"\>[\s\S]*?<\/div>\r?\n        <\/div>/,
  ''
);

// If that exact regex doesn't match, let's just search and destroy the Advanced Options toggle state if it exists.
content = content.replace(
  /const \[showAdvanced, setShowAdvanced\] = useState\(false\);\r?\n/,
  ''
);

content = content.replace(
  /\{\/\* Advanced Options \*\/\}\r?\n        <div className="bg-white border border-slate-200 rounded-\[1\.25rem\] p-4 mb-4 shadow-sm"\>[\s\S]*?<\/div>\r?\n        <\/div>/,
  ''
);

fs.writeFileSync('src/components/views/BridgeView.tsx', content, 'utf8');
console.log('Success!');
