const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\jbsin\\.gemini\\antigravity\\brain\\7a348847-b0eb-4d1e-a71b-4a1917e371e8\\.system_generated\\steps\\18959\\content.md', 'utf-8');
const text = content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ');
const start = text.indexOf('App Kits');
console.log(text.substring(start, start + 3000));
