const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { ethers } = require('ethers');

// 1. Compile the contract
const contractPath = path.resolve(__dirname, '../contracts/BridgingKitContract.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: { 'BridgingKitContract.sol': { content: source } },
  settings: { outputSelection: { '*': { '*': ['*'] } } },
};

console.log('Compiling contract...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));
if (output.errors) {
  output.errors.forEach(err => console.error(err.formattedMessage));
  process.exit(1);
}
const contractCode = output.contracts['BridgingKitContract.sol']['BridgingKitContract'];
const abi = contractCode.abi;
const bytecode = contractCode.evm.bytecode.object;

// 2. Setup networks
const NETWORKS = [
  {
    name: 'Ethereum Sepolia',
    rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
    tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
  },
  {
    name: 'Arbitrum Sepolia',
    rpc: 'https://arbitrum-sepolia-rpc.publicnode.com',
    tokenMessenger: '0x12dcfd3fe2e9eac2859fd1ed86d2ab8c5a2f9352',
    usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'
  },
  {
    name: 'Base Sepolia',
    rpc: 'https://base-sepolia-rpc.publicnode.com',
    tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
  }
];

async function main() {
  const privateKey = process.argv[2];
  if (!privateKey) {
    console.error("\n❌ Error: Please provide your private key as an argument.");
    console.error("Usage: node scratch/deploy_all.js <YOUR_PRIVATE_KEY>\n");
    process.exit(1);
  }

  for (const net of NETWORKS) {
    console.log(`\nDeploying to ${net.name}...`);
    try {
      const provider = new ethers.JsonRpcProvider(net.rpc);
      const wallet = new ethers.Wallet(privateKey, provider);
      const factory = new ethers.ContractFactory(abi, bytecode, wallet);

      const contract = await factory.deploy(net.tokenMessenger, net.usdc);
      await contract.waitForDeployment();
      
      const deployedAddress = await contract.getAddress();
      console.log(`✅ Success! Contract deployed to: ${deployedAddress}`);
      console.log(`Update BridgeView.tsx '${net.name}' with this address!`);
    } catch (err) {
      console.error(`❌ Failed on ${net.name}:`, err.message);
    }
  }
}

main();
