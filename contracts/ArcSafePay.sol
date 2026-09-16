// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ArcSafePay
 * @dev Reversible payments (escrow) contract for Arc Mainnet.
 * Allows a sender to lock an ERC-20 token (like USDC) into escrow for a receiver.
 * The sender can either release the funds to the receiver or cancel to get a refund.
 */

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

contract ArcSafePay {
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
     * @dev Create a new payment. Requires prior ERC-20 approval.
     */
    function createPayment(
        address _receiver,
        address _token,
        uint256 _amount
    ) external returns (uint256) {
        require(_receiver != address(0), "Invalid receiver");
        require(_amount > 0, "Amount must be > 0");

        // Transfer tokens from sender to this contract
        bool success = IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        require(success, "Transfer failed");

        uint256 paymentId = nextPaymentId++;

        payments[paymentId] = Payment({
            sender: msg.sender,
            receiver: _receiver,
            token: _token,
            amount: _amount,
            isActive: true
        });

        emit PaymentCreated(paymentId, msg.sender, _receiver, _token, _amount);
        return paymentId;
    }

    /**
     * @dev Release payment to the receiver. Only sender can release.
     */
    function releasePayment(uint256 _paymentId) external {
        Payment storage payment = payments[_paymentId];
        require(payment.isActive, "Payment not active");
        require(msg.sender == payment.sender, "Only sender can release");

        payment.isActive = false;

        bool success = IERC20(payment.token).transfer(payment.receiver, payment.amount);
        require(success, "Transfer failed");

        emit PaymentReleased(_paymentId, payment.receiver, payment.amount);
    }

    /**
     * @dev Cancel payment and refund sender. Only sender can cancel.
     */
    function cancelPayment(uint256 _paymentId) external {
        Payment storage payment = payments[_paymentId];
        require(payment.isActive, "Payment not active");
        require(msg.sender == payment.sender, "Only sender can cancel");

        payment.isActive = false;

        bool success = IERC20(payment.token).transfer(payment.sender, payment.amount);
        require(success, "Transfer failed");

        emit PaymentCancelled(_paymentId, payment.sender, payment.amount);
    }
}
