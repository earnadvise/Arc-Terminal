const { ethers } = require('ethers');

async function main() {
  const rpcUrl = 'https://rpc.mainnet.arc.io';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const txHash = "0x68dacde903badda302c154c651fb3db3a4985d660ecf9aff82f4e1b8b76ad905";

  const tx = await provider.getTransaction(txHash);
  try {
    const code = await provider.call({
      to: tx.to,
      data: tx.data,
      from: tx.from,
      value: tx.value,
      gasPrice: tx.gasPrice,
      gasLimit: tx.gasLimit
    }, tx.blockNumber - 1);
    console.log("Call result:", code);
  } catch (e) {
    console.log("Revert reason:", e.message);
    if (e.data) console.log("Revert data:", e.data);
  }
}
main();
