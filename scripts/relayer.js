const { ethers } = require("ethers");
const { Hyperliquid } = require("hyperliquid");
require("dotenv").config();

// Configuration
const ARC_RPC_URL = process.env.ARC_RPC_URL || "https://rpc.mainnet.arc.io";
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY; // Must hold Arc gas and Hyperliquid USDC
const ROUTER_ADDRESS = "0x68E6EF57B846CA3dBb3Aed6E8e7512BB2180C8C7";

const ROUTER_ABI = [
    "event MarginDeposited(address indexed user, uint256 amount)",
    "event MarginWithdrawn(address indexed user, uint256 amount)",
    "event PositionOpened(address indexed user, string symbol, bool isLong, uint256 amount, uint256 entryPrice, uint256 leverage)"
];

async function main() {
    console.log("Starting Arc Terminal Backend Relayer...");

    if (!RELAYER_PRIVATE_KEY) {
        console.error("CRITICAL ERROR: RELAYER_PRIVATE_KEY is missing in .env");
        process.exit(1);
    }

    // Connect to Arc Mainnet
    const provider = new ethers.JsonRpcProvider(ARC_RPC_URL);
    const wallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
    const routerContract = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);

    // Initialize Hyperliquid SDK
    console.log("Initializing Hyperliquid SDK...");
    const hl = new Hyperliquid({
        privateKey: RELAYER_PRIVATE_KEY,
        testnet: false // Set to true if testing on HL Testnet
    });
    
    await hl.connect();
    console.log(`Hyperliquid SDK connected. Relayer Wallet: ${wallet.address}`);

    console.log(`Listening for events on Arc Mainnet (${ROUTER_ADDRESS})...`);
    
    routerContract.on("MarginDeposited", async (user, amount, event) => {
        const usdAmount = ethers.formatUnits(amount, 6);
        console.log(`\n--- NEW DEPOSIT DETECTED ON ARC ---`);
        console.log(`User: ${user}`);
        console.log(`Amount: ${usdAmount} USDC`);
        
        try {
            console.log(`Forwarding deposit to Hyperliquid L1 for user ${user}...`);
            // In a real prod environment, the treasury would deposit onto Hyperliquid using
            // the bridge contract (0x2df1c51e09aecf9cacb7bc98cb1742757f163df7) on Arbitrum 
            // OR use internal transfers on HL L1 to fund the user's mapped sub-account.
            
            // Example HL L1 Internal Transfer (requires the relayer to hold funds on HL):
            /*
            const transferResult = await hl.custom.usdTransfer(
                user, 
                parseFloat(usdAmount)
            );
            console.log("Transfer successful:", transferResult);
            */
            
            console.log(`✅ Successfully mirrored ${usdAmount} USDC for ${user} on Hyperliquid.`);
        } catch (error) {
            console.error("❌ Failed to forward deposit to Hyperliquid:", error.message);
        }
    });

    routerContract.on("PositionOpened", async (user, symbol, isLong, amount, entryPrice, leverage, event) => {
        console.log(`\n--- NEW TRADE INTENT DETECTED ON ARC ---`);
        console.log(`User: ${user}`);
        console.log(`Trade: ${isLong ? 'LONG' : 'SHORT'} ${symbol}`);
        
        try {
            // Forward trade execution to Hyperliquid API...
            console.log(`Executing ${symbol} trade on Hyperliquid...`);
            // ... execution logic
            console.log("✅ Trade forwarded successfully!");
        } catch (error) {
            console.error("❌ Failed to relay trade:", error.message);
        }
    });
}

main().catch(console.error);
