
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import @openzeppelin/contracts/token/ERC20/IERC20.sol;

/**
 * @title ArcPerpRouter
 * @dev The Chain-Abstracted clearinghouse for Arc Terminal.
 * This contract secures user margin on Arc Mainnet, while the backend 
 * executes the actual trades on the Hyperliquid L1 orderbook.
 */
contract ArcPerpRouter {
    address public owner;
    address public marginToken;
    
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
        require(msg.sender == owner, Not authorized);
        _;
    }

    constructor(address _marginToken) {
        owner = msg.sender;
        marginToken = _marginToken;
    }

    /**
     * @dev User deposits margin into the vault.
     */
    function deposit(uint256 amount) external {
        require(amount > 0, Amount must be greater than 0);
        
        bool success = IERC20(marginToken).transferFrom(msg.sender, address(this), amount);
        require(success, Transfer failed);
        
        userMargin[msg.sender] += amount;
        emit MarginDeposited(msg.sender, amount);
    }

    /**
     * @dev User requests to withdraw their free margin.
     */
    function withdraw(uint256 amount) external {
        require(userMargin[msg.sender] >= amount, Insufficient margin);
        
        userMargin[msg.sender] -= amount;
        
        bool success = IERC20(marginToken).transfer(msg.sender, amount);
        require(success, Transfer failed);
        
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

    /**
     * @dev User submits an intent to close their position
     */
    function closePosition(string memory symbol, uint256 closeSize, uint256 leverage, int256 realizedPnl) external {
        // In a real decentralized model, backend listens to this intent.
    }

    /**
     * @dev User deposits additional margin into their specific position
     */
    function addMargin(string memory symbol, uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        bool success = IERC20(marginToken).transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");
        userMargin[msg.sender] += amount;
    }
    function cancelLimitOrder(string memory symbol, uint256 size, uint256 leverage) external {}
    function setTPSL(string memory symbol, uint256 takeProfit, uint256 stopLoss) external {}
    function placeLimitOrder(string memory symbol, bool isLong, uint256 size, uint256 targetPrice, uint256 leverage) external {}
}

