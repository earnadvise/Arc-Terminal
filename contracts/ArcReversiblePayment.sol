// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Interface for standard ERC20 functions needed for the ArcReversiblePayment escrow
 */
interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title ArcReversiblePayment
 * @dev A manual escrow contract for ERC20 tokens that allows the sender to manually
 * cancel or release funds without a time limit.
 */
contract ArcReversiblePayment {
    struct Payment {
        address sender;
        address receiver;
        address token;
        uint256 amount;
        bool isActive;
    }

    uint256 public nextPaymentId;
    mapping(uint256 => Payment) public payments;

    event PaymentCreated(
        uint256 indexed paymentId,
        address indexed sender,
        address indexed receiver,
        address token,
        uint256 amount
    );
    event PaymentCancelled(uint256 indexed paymentId, address indexed sender, uint256 amount);
    event PaymentReleased(uint256 indexed paymentId, address indexed receiver, uint256 amount);

    /**
     * @dev Creates an escrowed payment
     * @param receiver The address receiving the funds
     * @param token The ERC20 token address (e.g., USDC)
     * @param amount The amount of tokens
     */
    function createPayment(
        address receiver,
        address token,
        uint256 amount
    ) external returns (uint256) {
        require(receiver != address(0), "Invalid receiver");
        require(amount > 0, "Amount must be greater than 0");

        // Pull tokens from sender to this contract
        require(
            IERC20(token).transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );

        uint256 paymentId = nextPaymentId++;
        
        payments[paymentId] = Payment({
            sender: msg.sender,
            receiver: receiver,
            token: token,
            amount: amount,
            isActive: true
        });

        emit PaymentCreated(paymentId, msg.sender, receiver, token, amount);
        return paymentId;
    }

    /**
     * @dev Cancels an active payment. Only callable by the sender.
     * @param paymentId The ID of the payment to cancel
     */
    function cancel(uint256 paymentId) external {
        Payment storage p = payments[paymentId];
        require(p.isActive, "Payment is not active");
        require(msg.sender == p.sender, "Only sender can cancel");

        p.isActive = false;

        require(IERC20(p.token).transfer(p.sender, p.amount), "Token transfer failed");

        emit PaymentCancelled(paymentId, p.sender, p.amount);
    }

    /**
     * @dev Releases an active payment to the receiver. Only callable by the sender.
     * @param paymentId The ID of the payment to release
     */
    function release(uint256 paymentId) external {
        Payment storage p = payments[paymentId];
        require(p.isActive, "Payment is not active");
        require(msg.sender == p.sender, "Only sender can release");

        p.isActive = false;

        require(IERC20(p.token).transfer(p.receiver, p.amount), "Token transfer failed");

        emit PaymentReleased(paymentId, p.receiver, p.amount);
    }
}
