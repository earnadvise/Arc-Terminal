
const { ethers } = require(ethers);
const crypto = require(crypto);
require(dotenv).config();

// Configuration
const ARC_RPC_URL = process.env.ARC_RPC_URL || https://rpc.mainnet.arc.io;
const EDGEX_API_URL = https://api.edgex.exchange/v2; // Official V2 API
const EDGEX_ACCOUNT_ID = process.env.EDGEX_ACCOUNT_ID || 790273066352509653; 
const EDGEX_TRADING_KEY = process.env.EDGEX_TRADING_KEY; // Your private SDK Signer key

// The address of our ArcPerpRouter (or edgeX official deposit contract)
const ROUTER_ADDRESS = 0x2bD48D871D19222464295677e06C45210594b1C0;
const ROUTER_ABI = [
    event PositionOpened(address indexed user, string symbol, bool isLong, uint256 amount, uint256 entryPrice, uint256 leverage)
];

// Helper: edgeX API Authentication Signature (HMAC SHA256)
function generateEdgexSignature(timestamp, method, requestPath, body = ") {
 const message = timestamp + method + requestPath + body;
 return crypto.createHmac(sha256, EDGEX_TRADING_KEY).update(message).digest(hex);
}

async function placeEdgexOrder(symbol, isLong, sizeUsd, leverage) {
 const endpoint = /orders;
 const method = POST;
 const timestamp = Date.now().toString();

 // Format the order payload for edgeX
 const body = JSON.stringify({
 accountId: EDGEX_ACCOUNT_ID,
 market: symbol,
 side: isLong ? BUY : SELL,
 type: MARKET,
 size: sizeUsd, // Format depending on edgeX tick sizes
 leverage: leverage
 });

 const signature = generateEdgexSignature(timestamp, method, endpoint, body);

 console.log(Forwarding trade to edgeX API...);
 
 // In production, you would uncomment this fetch to actually hit the edgeX server
 /*
 const response = await fetch(EDGEX_API_URL + endpoint, {
 method: method,
 headers: {
 Content-Type: application/json,
 X-EDGEX-API-KEY: EDGEX_TRADING_KEY, // Note: Use the public key here if they separate it
 X-EDGEX-TIMESTAMP: timestamp,
 X-EDGEX-SIGNATURE: signature
 },
 body: body
 });
 const result = await response.json();
 console.log(edgeX Response:, result);
 */
 console.log(Mock edgeX Trade Executed Successfully!);
}

async function main() {
 console.log(Starting edgeX Native Relayer on Arc Mainnet...);

 if (!EDGEX_TRADING_KEY) {
 console.warn(WARNING: EDGEX_TRADING_KEY is missing in .env. Order routing will be mocked.);
 }

 const provider = new ethers.JsonRpcProvider(ARC_RPC_URL);
 const routerContract = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, provider);

 console.log(Listening for User Trades on Arc Mainnet ()...);
 
 routerContract.on(PositionOpened, async (user, symbol, isLong, amount, entryPrice, leverage) => {
 console.log(\n--- NEW USER TRADE DETECTED ---);
 console.log(User: );
 console.log(Action:   | Leverage: x);
 
 try {
 const sizeUsd = Number(ethers.formatUnits(amount, 6)) * Number(leverage);
 await placeEdgexOrder(symbol, isLong, sizeUsd, leverage);
 } catch (error) {
 console.error(Failed to route trade to edgeX:, error);
 }
 });
}

main().catch(console.error);
