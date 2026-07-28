async function main() {
  const rpc = 'https://rpc.testnet.arc.network';
  const usdcAddress = '0x3600000000000000000000000000000000000000';
  const myWallet = '0xe181e495d364558A53774B06bE135E1A283A42a7'; // Using the other contract as a dummy from address
  const perpVault = '0x503B3910ff21948464AA92BaB16a6200848bD11B';
  
  const pad = (addr) => addr.toLowerCase().replace('0x', '').padStart(64, '0');
  const padHex = (num) => num.toString(16).padStart(64, '0');
  
  // mint(address to, uint256 amount) -> 0x40c10f19
  // amount = 5000 USDC -> 5000 * 1e6 = 5000000000 = 0x12a05f200
  const mintData = '0x40c10f19' + pad(perpVault) + padHex(5000000000);
  
  try {
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{
          to: usdcAddress,
          data: mintData
        }, 'latest']
      })
    });
    const data = await res.json();
    console.log('Mint simulation result:', data);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main();
