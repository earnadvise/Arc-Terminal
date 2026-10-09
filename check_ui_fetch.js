const address = "0xaa81a05cc092b395eb730768c78c39de6729cce9";
const padAddress = (addr) => addr.replace('0x', '').padStart(64, '0');

async function main() {
  const rpcUrl = 'https://rpc.mainnet.arc.io';
  const req = (method, params) => fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  }).then(r => r.json());

  const walletRes = await req('eth_call', [{ to: '0x3600000000000000000000000000000000000000', data: '0x70a08231' + padAddress(address) }, 'latest']);
  
  console.log("UI Fetch Result:", walletRes);
}
main();
