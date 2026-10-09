const { ethers } = require('ethers');

async function main() {
  const rpcUrl = 'https://rpc.mainnet.arc.io';
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const routerAddress = "0x68E6EF57B846CA3dBb3Aed6E8e7512BB2180C8C7";
  const userAddress = "0xaa81a05cc092b395eb730768c78c39de6729cce9"; // from Rabby popup

  const routerAbi = ["function marginToken() view returns (address)"];
  const router = new ethers.Contract(routerAddress, routerAbi, provider);
  
  try {
    const marginTokenAddress = await router.marginToken();
    console.log("Router marginToken:", marginTokenAddress);

    const erc20Abi = [
      "function balanceOf(address account) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function allowance(address owner, address spender) view returns (uint256)"
    ];
    const token = new ethers.Contract(marginTokenAddress, erc20Abi, provider);

    const decimals = await token.decimals();
    const balance = await token.balanceOf(userAddress);
    const allowance = await token.allowance(userAddress, routerAddress);

    console.log("Margin Token Decimals:", decimals);
    console.log("User Balance:", ethers.formatUnits(balance, decimals));
    console.log("User Allowance to Router:", ethers.formatUnits(allowance, decimals));
    
    console.log("Raw Balance:", balance.toString());
    console.log("Raw Allowance:", allowance.toString());

  } catch (e) {
    console.error("Error:", e);
  }
}
main();
