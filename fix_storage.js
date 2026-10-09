const fs = require('fs');
let code = fs.readFileSync('src/lib/hyperliquid-kit.ts', 'utf8');

const regex = /if \(typeof window !== 'undefined' && localStorage\.getItem\('hl_session_key_active'\) === 'true'\) \{[\s\S]*?setSessionKeyActive\(true\);[\s\S]*?localStorage\.setItem\('hl_session_key_active', 'true'\);[\s\S]*?\}/;

const newCode = `if (typeof window !== 'undefined' && localStorage.getItem('hl_session_key_active') === 'true') {
      if (localStorage.getItem('hl_agent_private_key')) {
        setSessionKeyActive(true);
        localStorage.setItem('hl_session_key_active', 'true');
      } else {
        localStorage.removeItem('hl_session_key_active');
        setSessionKeyActive(false);
      }
    }`;

code = code.replace(regex, newCode);
fs.writeFileSync('src/lib/hyperliquid-kit.ts', code);
