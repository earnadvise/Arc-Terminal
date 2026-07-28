// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BridgingKitContract
 * @dev A CCTP Wrapper to bridge USDC directly across networks, allowing for future atomic logic.
 */

interface ITokenMessenger {
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken
    ) external returns (uint64 _nonce);
}

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract BridgingKitContract {
    address public immutable tokenMessenger;
    address public immutable usdc;

    event BridgeInitiated(
        address indexed sender,
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        uint64 nonce
    );

    constructor(address _tokenMessenger, address _usdc) {
        tokenMessenger = _tokenMessenger;
        usdc = _usdc;
    }

    /**
     * @dev Bridges USDC to another chain via CCTP
     * @param amount Amount of USDC to bridge
     * @param destinationDomain Circle's domain ID for the destination chain
     * @param mintRecipient The bytes32-padded address of the recipient on the destination chain
     */
    function bridgeUSDC(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient
    ) external {
        // 1. Pull USDC from user to this contract
        require(IERC20(usdc).transferFrom(msg.sender, address(this), amount), "USDC transfer failed");

        // 2. Approve TokenMessenger to spend the USDC
        require(IERC20(usdc).approve(tokenMessenger, amount), "USDC approval failed");

        // 3. Burn USDC via Circle CCTP TokenMessenger
        uint64 nonce = ITokenMessenger(tokenMessenger).depositForBurn(
            amount,
            destinationDomain,
            mintRecipient,
            usdc
        );

        emit BridgeInitiated(msg.sender, amount, destinationDomain, mintRecipient, nonce);
    }
}
