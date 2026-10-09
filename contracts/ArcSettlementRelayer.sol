// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ArcSettlementRelayer
 * @dev Advanced chain-abstracted clearinghouse for Arc Terminal.
 * Built for deterministic sub-second finality on Arc Mainnet, routing liquidity directly to Hyperliquid.
 */
contract ArcSettlementRelayer is ReentrancyGuard, Ownable {
    IERC20 public immutable marginToken;
    address public feeCollector;
    
    // Fee in basis points (1 bps = 0.01%). Default: 10 bps (0.1%)
    uint256 public bridgingFeeBps = 10;
    
    // Tracks user margin balances deposited into the relayer vault
    mapping(address => uint256) public userMargin;

    // Events for the Backend Relayer to index
    event MarginDeposited(address indexed user, uint256 grossAmount, uint256 netAmount, uint256 fee);
    event MarginWithdrawn(address indexed user, uint256 amount);
    event FeeCollectorUpdated(address indexed newCollector);
    event BridgingFeeUpdated(uint256 newFeeBps);
    
    // Intent events
    event PositionOpened(address indexed user, string symbol, bool isLong, uint256 amount, uint256 entryPrice, uint256 leverage);
    event PositionClosed(address indexed user, string symbol, uint256 closeSize, int256 realizedPnl);

    constructor(address _marginToken, address _feeCollector) Ownable(msg.sender) {
        require(_marginToken != address(0), "Invalid token address");
        require(_feeCollector != address(0), "Invalid fee collector address");
        
        marginToken = IERC20(_marginToken);
        feeCollector = _feeCollector;
    }

    /**
     * @dev User deposits margin into the relayer.
     * Takes a small bps fee to cover cross-chain backend execution costs.
     */
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        
        // Calculate fee
        uint256 fee = (amount * bridgingFeeBps) / 10000;
        uint256 netAmount = amount - fee;
        
        // Transfer total amount from user
        require(marginToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // Transfer fee to collector
        if (fee > 0) {
            require(marginToken.transfer(feeCollector, fee), "Fee transfer failed");
        }
        
        // Credit net amount to user
        userMargin[msg.sender] += netAmount;
        
        emit MarginDeposited(msg.sender, amount, netAmount, fee);
    }

    /**
     * @dev User withdraws free margin.
     */
    function withdraw(uint256 amount) external nonReentrant {
        require(userMargin[msg.sender] >= amount, "Insufficient margin");
        
        userMargin[msg.sender] -= amount;
        require(marginToken.transfer(msg.sender, amount), "Transfer failed");
        
        emit MarginWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Admin settles a position, updating user balance based on PnL
     */
    function settlePosition(address user, string memory symbol, uint256 closeSize, int256 realizedPnl) external onlyOwner {
        if (realizedPnl > 0) {
            userMargin[user] += uint256(realizedPnl);
        } else if (realizedPnl < 0) {
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
     * @dev Intent to open a position (listened to by backend)
     */
    function openPosition(string memory symbol, bool isLong, uint256 amount, uint256 entryPrice, uint256 leverage) external {
        emit PositionOpened(msg.sender, symbol, isLong, amount, entryPrice, leverage);
    }

    // --- Admin Functions ---

    function setFeeCollector(address _newCollector) external onlyOwner {
        require(_newCollector != address(0), "Invalid address");
        feeCollector = _newCollector;
        emit FeeCollectorUpdated(_newCollector);
    }

    function setBridgingFee(uint256 _newFeeBps) external onlyOwner {
        require(_newFeeBps <= 500, "Fee cannot exceed 5%");
        bridgingFeeBps = _newFeeBps;
        emit BridgingFeeUpdated(_newFeeBps);
    }
}
