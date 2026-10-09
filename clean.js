const fs = require('fs');

async function main() {
    let raw = fs.readFileSync('flattened.sol', 'utf8');
    
    // Remove all SPDX lines
    raw = raw.replace(/\/\/ SPDX-License-Identifier:.*$/gm, '');
    
    // Remove all pragma lines
    raw = raw.replace(/pragma solidity.*$/gm, '');
    
    // Add one SPDX and one pragma at the very top
    const clean = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

` + raw.trim();

    fs.writeFileSync('flattened_clean.sol', clean);
}
main();
