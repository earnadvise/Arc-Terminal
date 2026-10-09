const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\jbsin\\.gemini\\antigravity\\brain\\7a348847-b0eb-4d1e-a71b-4a1917e371e8\\.system_generated\\steps\\24107\\content.md', 'utf8');
const match = html.match(/id="__NEXT_DATA__" type="application\/json">([\s\S]+?)<\/script>/);
if (match) {
  const data = JSON.parse(match[1]);
  // Just print the whole json to see its structure
  console.log(JSON.stringify(data, null, 2).substring(0, 3000));
} else {
  console.log('not found');
}
