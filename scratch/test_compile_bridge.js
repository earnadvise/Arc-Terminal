const fs = require('fs');
const solc = require('solc');
const path = require('path');

const contractPath = path.resolve(__dirname, '../contracts/BridgingKitContract.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'BridgingKitContract.sol': {
      content: source,
    },
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['*'],
      },
    },
  },
};

console.log('Compiling contract...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  let hasErrors = false;
  output.errors.forEach((err) => {
    console.error(err.formattedMessage);
    if (err.severity === 'error') hasErrors = true;
  });
  if (hasErrors) process.exit(1);
}

console.log('Compilation successful!');
const contract = output.contracts['BridgingKitContract.sol']['BridgingKitContract'];
console.log('Bytecode length:', contract.evm.bytecode.object.length);
console.log('ABI:', JSON.stringify(contract.abi, null, 2));
