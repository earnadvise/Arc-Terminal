// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title ArcPerpVault
 * @dev A smart contract managing collateral deposits, withdrawals, and ownership controls
 * for Arc Terminal perpetual DEX on Arc Testnet.
 */
contract ArcPerpVault {
    address public owner;
    IERC20 public collateralToken;
    
    // Mapping from user address to their deposited collateral balance
    mapping(address => uint256) public userCollateral;
    // Mapping from user address to their locked margin
    mapping(address => uint256) public lockedMargin;
    
    // Events
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event PositionOpened(
        address indexed user,
        string symbol,
        bool isLong,
        uint256 size,
        uint256 entryPrice,
        uint256 leverage
    );
    event PositionClosed(address indexed user, string symbol, int256 realizedPnl);
    
    event LimitOrderPlaced(address indexed user, string symbol, bool isLong, uint256 size, uint256 targetPrice, uint256 leverage);
    event LimitOrderCancelled(address indexed user, string symbol);
    event LimitOrderExecuted(address indexed user, string symbol, uint256 executionPrice);
    
    event TPSLSet(address indexed user, string symbol, uint256 takeProfit, uint256 stopLoss);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "ArcPerpVault: caller is not the owner");
        _;
    }

    constructor(address _collateralToken) {
        owner = msg.sender;
        collateralToken = IERC20(_collateralToken);
    }

    /**
     * @dev Transfers ownership of the contract to a new account.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ArcPerpVault: new owner is zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @dev Deposit USDC collateral into the vault to back perpetual trades.
     */
    function depositCollateral(uint256 amount) external {
        require(amount > 0, "ArcPerpVault: deposit must be greater than 0");
        require(
            collateralToken.transferFrom(msg.sender, address(this), amount),
            "ArcPerpVault: token transfer failed"
        );
        userCollateral[msg.sender] += amount;
        emit Deposit(msg.sender, amount);
    }

    /**
     * @dev Withdraw collateral from the vault.
     */
    function withdrawCollateral(uint256 amount) external {
        require(amount > 0, "ArcPerpVault: withdraw must be greater than 0");
        require(userCollateral[msg.sender] >= amount, "ArcPerpVault: insufficient balance");
        userCollateral[msg.sender] -= amount;
        require(
            collateralToken.transfer(msg.sender, amount),
            "ArcPerpVault: token transfer failed"
        );
        emit Withdraw(msg.sender, amount);
    }

    /**
     * @dev Emits an event when a user opens a perpetual position.
     * Useful for off-chain indexing and tracking active trades on-chain.
     */
    function openPosition(
        string calldata symbol,
        bool isLong,
        uint256 size,
        uint256 entryPrice,
        uint256 leverage
    ) external {
        uint256 marginRequired = size / leverage;
        require(userCollateral[msg.sender] >= marginRequired, "ArcPerpVault: insufficient collateral for margin");
        
        userCollateral[msg.sender] -= marginRequired;
        lockedMargin[msg.sender] += marginRequired;

        emit PositionOpened(msg.sender, symbol, isLong, size, entryPrice, leverage);
    }

    /**
     * @dev Emits an event when a position is closed, unlocking only the specific position's margin.
     */
    function closePosition(string calldata symbol, uint256 size, uint256 leverage, int256 realizedPnl) external {
        uint256 unlockedMargin = size / leverage;
        
        if (lockedMargin[msg.sender] >= unlockedMargin) {
            lockedMargin[msg.sender] -= unlockedMargin;
        } else {
            unlockedMargin = lockedMargin[msg.sender];
            lockedMargin[msg.sender] = 0;
        }

        // Apply PnL
        if (realizedPnl >= 0) {
            userCollateral[msg.sender] += unlockedMargin + uint256(realizedPnl);
        } else {
            uint256 loss = uint256(-realizedPnl);
            if (loss >= unlockedMargin) {
                userCollateral[msg.sender] += 0; // liquidated
            } else {
                userCollateral[msg.sender] += unlockedMargin - loss;
            }
        }

        emit PositionClosed(msg.sender, symbol, realizedPnl);
    }

    /**
     * @dev Places a limit order on-chain
     */
    function placeLimitOrder(string calldata symbol, bool isLong, uint256 size, uint256 targetPrice, uint256 leverage) external {
        uint256 marginRequired = size / leverage;
        require(userCollateral[msg.sender] >= marginRequired, "ArcPerpVault: insufficient collateral for limit order");
        
        userCollateral[msg.sender] -= marginRequired;
        lockedMargin[msg.sender] += marginRequired;

        emit LimitOrderPlaced(msg.sender, symbol, isLong, size, targetPrice, leverage);
    }

    /**
     * @dev Cancels a limit order and unlocks margin
     */
    function cancelLimitOrder(string calldata symbol, uint256 size, uint256 leverage) external {
        uint256 marginRequired = size / leverage;
        
        if (lockedMargin[msg.sender] >= marginRequired) {
            lockedMargin[msg.sender] -= marginRequired;
            userCollateral[msg.sender] += marginRequired;
        }
        
        emit LimitOrderCancelled(msg.sender, symbol);
    }

    /**
     * @dev Sets Take Profit and Stop Loss for a position
     */
    function setTPSL(string calldata symbol, uint256 takeProfit, uint256 stopLoss) external {
        emit TPSLSet(msg.sender, symbol, takeProfit, stopLoss);
    }


    /**
     * @dev Emergency withdraw of all collateral tokens back to the owner.
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = collateralToken.balanceOf(address(this));
        require(collateralToken.transfer(owner, balance), "ArcPerpVault: transfer failed");
    }
}
