const { ethers } = require('ethers');

async function main() {
  const ethProvider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
  const contractAddress = '0x86467403A7A6E4B07B469a14Fd0cC1b69956b236';
  
  const abi = [
    "function bridgeUSDC(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient)"
  ];
  const kit = new ethers.Contract(contractAddress, abi, ethProvider);

  const amount = 5000000n; // 5 USDC
  const domain = 3; // Arb Sepolia
  const recipient = ethers.zeroPadValue('0xAa81a036Bf5a2823dAa2Aadbcc66140fAb29CcE9', 32);

  console.log("Simulating bridgeUSDC on Sepolia...");
  try {
    await kit.bridgeUSDC.estimateGas(amount, domain, recipient, { from: '0xAa81a036Bf5a2823dAa2Aadbcc66140fAb29CcE9' });
    console.log("Success!");
  } catch (err) {
    console.error("Reverted:", err.message || err);
  }

  // Check Arc Testnet USDC decimals
  const arcProvider = new ethers.JsonRpcProvider('https://testnet-rpc.arcscan.app');
  const arcUsdc = new ethers.Contract('0x3600000000000000000000000000000000000000', [
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)"
  ], arcProvider);
  
  try {
    const decimals = await arcUsdc.decimals();
    console.log("Arc Testnet USDC Decimals:", decimals);
    const bal = await arcUsdc.balanceOf('0xAa81a036Bf5a2823dAa2Aadbcc66140fAb29CcE9');
    console.log("Arc Testnet User Balance:", bal.toString());
  } catch (err) {
    console.error("Failed to read Arc USDC:", err);
  }
}

main();
