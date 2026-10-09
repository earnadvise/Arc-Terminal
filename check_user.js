const { ethers } = require('ethers');

async function main() {
  const rpcUrl = 'https://rpc.mainnet.arc.io';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const address = "0xAa81a036Bf5a2823dAA2Aadbcc66140fAb29CcE9";

  const tokenAddress = "0x3600000000000000000000000000000000000000";
  const abi = ["function balanceOf(address) view returns (uint256)"];
  const token = new ethers.Contract(tokenAddress, abi, provider);

  const nativeBal = await provider.getBalance(address);
  const tokenBal = await token.balanceOf(address);

  console.log("Native Arc Balance:", nativeBal.toString());
  console.log("Token 0x3600... Balance:", tokenBal.toString());
}
main();
