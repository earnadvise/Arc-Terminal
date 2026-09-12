const fs = require('fs');
const content = fs.readFileSync('src/context/useAppState.tsx', 'utf-8');
const lines = content.split('\n');
for (let i=0; i<lines.length; i++) {
    if (lines[i].includes('.tp') || lines[i].includes('tp:')) {
        console.log(`${i+1}: ${lines[i]}`);
    }
}
