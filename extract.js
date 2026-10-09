const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\jbsin\\.gemini\\antigravity\\brain\\7a348847-b0eb-4d1e-a71b-4a1917e371e8\\.system_generated\\steps\\24107\\content.md', 'utf8');
const cleanText = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                      .replace(/<[^>]+>/g, ' ')
                      .replace(/\s+/g, ' ');
console.log(cleanText.substring(0, 4000));
