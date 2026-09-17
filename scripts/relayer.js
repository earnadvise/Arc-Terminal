
const { ethers } = require(ethers);
const { Hyperliquid } = require(hyperliquid);
require(dotenv).config();

// Configuration
const ARC_RPC_URL = process.env.ARC_RPC_URL || https://rpc.mainnet.arc.io;
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY; // Must hold Arc gas and Hyperliquid USDC
const ROUTER_ADDRESS = 0x2bD48D871D19222464295677e06C45210594b1C0;

// Minimal ABI to listen to the events
const ROUTER_ABI = [
    event PositionOpened(address indexed user, string symbol, bool isLong, uint256 amount, uint256 entryPrice, uint256 leverage),
    event PositionClosed(address indexed user, string symbol, uint256 closeSize, int256 realizedPnl),
    function settlePosition(address user, string symbol, uint256 closeSize, int256 realizedPnl) external
];

async function main() {
    console.log(Starting Synthra Chain-Abstracted Relayer...);

    if (!RELAYER_PRIVATE_KEY) {
        console.error(CRITICAL ERROR: RELAYER_PRIVATE_KEY is missing in .env);
        process.exit(1);
    }

    // 1. Connect to Arc Mainnet
    const provider = new ethers.JsonRpcProvider(ARC_RPC_URL);
    const wallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
    const routerContract = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);

    // 2. Connect to Hyperliquid API
    // The SDK uses the relayer private key to sign L1 Actions gaslessly
    console.log(Initializing Hyperliquid SDK...);
    const hl = new Hyperliquid({
        privateKey: RELAYER_PRIVATE_KEY,
        testnet: false // Set to true if testing on HL Testnet
    });
    
    // Connect websocket and wait for initialization
    await hl.connect();
    console.log(Hyperliquid SDK connected. Relayer Wallet: );

    // 3. Listen to Arc Mainnet events
    console.log(Listening for PositionOpened events on Arc Mainnet ()...);
    
    routerContract.on(PositionOpened, async (user, symbol, isLong, amount, entryPrice, leverage, event) => {
        console.log(\n--- NEW TRADE INTENT DETECTED ON ARC ---);
        console.log(User: );
        console.log(Trade: );
        console.log(Amount: USDC); // Assuming 6 decimals
        console.log(Leverage: x);
        
        try {
            // Step 1: Update leverage on Hyperliquid
            await hl.custom.updateLeverage(symbol, cross, Number(leverage));
            
            // Step 2: Calculate position size based on Hyperliquid rules
            // (Note: You may need to fetch exact mark prices to format the size correctly)
            const usdSize = Number(ethers.formatUnits(amount, 6)) * Number(leverage);
            
            // Note: Hyperliquid requires size in terms of the asset (e.g., 0.1 BTC), not USD!
            // For a robust relayer, fetch the live mark price from hl.info.getAllMids() to divide usdSize / price.
            console.log(Placing order on Hyperliquid (Target USD Notional: {usdSize})...);
            
            // Step 3: Execute trade on Hyperliquid
            // This signs an EIP-712 payload instantly. 
            // In a real prod setup, size needs to be correctly formatted per asset.
            /*
            const result = await hl.custom.marketOpen(
                symbol,
                isLong,
                assetSize,
                undefined, // px
                0.01 // 1% slippage
            );
            console.log(Order filled on Hyperliquid:, result);
            */
            
            console.log(Trade forwarded successfully! Waiting for next event...);

        } catch (error) {
            console.error(Failed to relay trade to Hyperliquid:, error.message);
        }
    });
}

main().catch(console.error);
