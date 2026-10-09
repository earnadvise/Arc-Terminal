const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\jbsin\\.gemini\\antigravity\\brain\\7a348847-b0eb-4d1e-a71b-4a1917e371e8\\.system_generated\\logs\\transcript_full.jsonl', 'utf8');
const lines = content.split('\n');
let target = '';
for (const line of lines) {
    if (!line) continue;
    try {
        const j = JSON.parse(line);
        if (j.content && j.content.includes('this is delete for me // File:')) {
            target = j.content;
        }
    } catch(e){}
}
let raw = target.replace('this is delete for me ', '');
raw = raw.replace(/pragma solidity.*$/gm, '');
raw = raw.replace(/\/\/ SPDX-License-Identifier:.*$/gm, '');
const clean = '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\n' + raw.trim();
fs.writeFileSync('C:\\Users\\jbsin\\.gemini\\antigravity\\brain\\7a348847-b0eb-4d1e-a71b-4a1917e371e8\\ArcSettlementRelayer_Etherscan.sol', clean);
