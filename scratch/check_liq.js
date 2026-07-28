async function main() {
  const rpc = 'https://rpc.testnet.arc.network';
  const usdcAddress = '0x3600000000000000000000000000000000000000';
  const perpVault = '0x503B3910ff21948464AA92BaB16a6200848bD11B';
  const usdcVault = '0xB5dAd4840ef25d6A7Ea8c19E8C6d438197F5AfB9';
  
  const pad = (addr) => addr.toLowerCase().replace('0x', '').padStart(64, '0');
  
  async function getBalance(owner) {
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{
          to: usdcAddress,
          data: '0x70a08231' + pad(owner) // balanceOf(address)
        }, 'latest']
      })
    });
    const data = await res.json();
    if(data.result && data.result !== '0x') {
      return (Number(BigInt(data.result)) / 1e6).toFixed(6);
    }
    return '0.000000';
  }
  
  try {
    const perpBal = await getBalance(perpVault);
    console.log(`Perpetuals Vault (${perpVault}) USDC Balance:`, perpBal);
    
    const vaultBal = await getBalance(usdcVault);
    console.log(`USDC Yield Vault (${usdcVault}) USDC Balance:`, vaultBal);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main();
