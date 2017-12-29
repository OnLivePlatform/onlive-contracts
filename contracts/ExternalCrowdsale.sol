pragma solidity 0.4.18;

import { SafeMath } from "zeppelin-solidity/contracts/math/SafeMath.sol";
import { Ownable } from "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract Mintable {
    function mint(address to, uint256 amount) public;
}


/**
 * @title Crowdsale for off-chain payment methods
 * @author Jakub Stefanski
 */
contract ExternalCrowdsale is Ownable {

    using SafeMath for uint256;

    struct Purchase {
        address purchaser;
        uint256 amount;
    }

    /**
     * @dev Address of mintable token instance
     */
    Mintable public token;

    /**
     * @dev Start block of active sale (inclusive). Zero if not scheduled.
     */
    uint256 public startBlock;

    /**
     * @dev End block of active sale (inclusive). Zero if not scheduled.
     */
    uint256 public endBlock;

    /**
     * @dev Registered purchases by payment id
     */
    mapping (bytes32 => Purchase) private purchases;

    /**
     * @dev Current amount of tokens available for sale
     */
    uint256 public availableAmount;

    function ExternalCrowdsale(Mintable _token, uint256 _availableAmount)
        public
        onlyValid(_token)
        onlyNotZero(_availableAmount)
    {
        token = _token;
        availableAmount = _availableAmount;
    }

    /**
     * @dev Purchase with given payment id registered
     * @param paymentId bytes32 A unique payment id
     * @param purchaser address The recipient of the tokens
     * @param amount uint256 The amount of tokens
     */
    event PurchaseRegistered(bytes32 indexed paymentId, address indexed purchaser, uint256 amount);

    /**
     * @dev Sale scheduled on the given blocks
     * @param startBlock uint256 The first block of active sale
     * @param endBlock uint256 The last block of active sale
     */
    event SaleScheduled(uint256 startBlock, uint256 endBlock);

    modifier onlySufficientAvailableTokens(uint256 amount) {
        require(availableAmount >= amount);
        _;
    }

    modifier onlyUniquePayment(bytes32 paymentId) {
        require(!isPaymentRegistered(paymentId));
        _;
    }

    modifier onlyValid(address addr) {
        require(addr != address(0));
        _;
    }

    modifier onlyNotZero(uint256 value) {
        require(value != 0);
        _;
    }

    modifier onlyNotScheduled() {
        require(startBlock == 0);
        require(endBlock == 0);
        _;
    }

    modifier onlyActive() {
        require(isActive());
        _;
    }

    /**
     * @dev Schedule sale for given block range
     * @param _startBlock uint256 The first block of sale
     * @param _endBlock uint256 The last block of sale
     */
    function scheduleSale(uint256 _startBlock, uint256 _endBlock)
        public
        onlyOwner
        onlyNotScheduled
        onlyNotZero(_startBlock)
        onlyNotZero(_endBlock)
    {
        require(_startBlock < _endBlock);

        startBlock = _startBlock;
        endBlock = _endBlock;

        SaleScheduled(_startBlock, _endBlock);
    }

    /**
     * @dev Register purchase with given payment id
     * @param paymentId bytes32 A unique payment id
     * @param purchaser address The recipient of the tokens
     * @param amount uint256 The amount of tokens
     */
    function registerPurchase(bytes32 paymentId, address purchaser, uint256 amount)
        public
        onlyOwner
        onlyActive
        onlyValid(purchaser)
        onlyNotZero(amount)
        onlyUniquePayment(paymentId)
        onlySufficientAvailableTokens(amount)
    {
        purchases[paymentId] = Purchase({
            purchaser: purchaser,
            amount: amount
        });

        availableAmount = availableAmount.sub(amount);

        token.mint(purchaser, amount);

        PurchaseRegistered(paymentId, purchaser, amount);
    }

    /**
     * @dev Check whether payment is already registered
     * @param paymentId bytes32 The payment id
     */
    function isPaymentRegistered(bytes32 paymentId) public view returns (bool) {
        Purchase storage purchase = purchases[paymentId];
        return purchase.purchaser != address(0) && purchase.amount != 0;
    }

    /**
     * @dev Check whether sale is currently active
     */
    function isActive() public view returns (bool) {
        return block.number >= startBlock && block.number <= endBlock;
    }
}
