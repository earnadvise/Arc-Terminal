const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\jbsin\\.gemini\\antigravity\\brain\\7a348847-b0eb-4d1e-a71b-4a1917e371e8\\.system_generated\\steps\\24107\\content.md', 'utf8');
const pTags = html.match(/<p[\s\S]*?<\/p>/gi);
if (pTags) {
    console.log(pTags.map(p => p.replace(/<[^>]+>/g, '')).join('\n'));
} else {
    console.log('no p tags found');
}
