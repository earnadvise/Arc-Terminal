
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ArcPerpRouter
 * @dev The Chain-Abstracted clearinghouse for Arc Terminal.
 * This contract secures user margin on Arc Mainnet, while the backend 
 * executes the actual trades on the Hyperliquid L1 orderbook.
 */
contract ArcPerpRouter {
    address public owner;
    
    // Tracks user margin balances deposited into the vault
    mapping(address => uint256) public userMargin;

    // Events for the Backend Relayer to listen to
    event MarginDeposited(address indexed user, uint256 amount);
    event MarginWithdrawn(address indexed user, uint256 amount);
    event PositionOpened(
        address indexed user, 
        string symbol, 
        bool isLong, 
        uint256 amount, 
        uint256 entryPrice, 
        uint256 leverage
    );
    event PositionClosed(
        address indexed user, 
        string symbol, 
        uint256 closeSize, 
        int256 realizedPnl
    );

    modifier onlyOwner() {
        require(msg.sender == owner, " Not authorized\);
 _;
 }

 constructor() {
 owner = msg.sender;
 }

 /**
 * @dev User deposits margin into the vault.
 */
 function deposit(uint256 amount) external {
 require(amount > 0, \Amount must be greater than 0\);
 
 userMargin[msg.sender] += amount;
 emit MarginDeposited(msg.sender, amount);
 }

 /**
 * @dev User requests to withdraw their free margin.
 */
 function withdraw(uint256 amount) external {
 require(userMargin[msg.sender] >= amount, \Insufficient margin\);
 
 userMargin[msg.sender] -= amount;
 emit MarginWithdrawn(msg.sender, amount);
 }

 /**
 * @dev User submits an on-chain intent to open a perpetual position.
 * The backend listens to this event and executes it on Hyperliquid.
 */
 function openPosition(
 string memory symbol,
 bool isLong,
 uint256 amount,
 uint256 entryPrice,
 uint256 leverage
 ) external {
 emit PositionOpened(msg.sender, symbol, isLong, amount, entryPrice, leverage);
 }

 /**
 * @dev Called by the OWNER (the backend relayer) when a position is closed on Hyperliquid.
 * This settles the Profit/Loss into the users on-chain margin balance.
 */
 function settlePosition(address user, string memory symbol, uint256 closeSize, int256 realizedPnl) external onlyOwner {
 if (realizedPnl > 0) {
 // User made a profit, add to their margin
 userMargin[user] += uint256(realizedPnl);
 } else if (realizedPnl < 0) {
 // User took a loss, deduct from their margin
 uint256 loss = uint256(-realizedPnl);
 if (userMargin[user] >= loss) {
 userMargin[user] -= loss;
 } else {
 userMargin[user] = 0; // Liquidated
 }
 }
 
 emit PositionClosed(user, symbol, closeSize, realizedPnl);
 }
}
