pragma solidity 0.4.18;

import { SafeMath } from "zeppelin-solidity/contracts/math/SafeMath.sol";
import { Ownable } from "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract Mintable {
    function mint(address to, uint256 amount) public;
}


/**
 * @title Crowdsale for off-chain payment methods.
 */
contract ExternalCrowdsale is Ownable {

    using SafeMath for uint256;

    struct Purchase {
        address purchaser;
        uint256 amount;
    }

    Mintable public token;

    uint256 public startBlock;
    uint256 public endBlock;

    mapping (bytes32 => Purchase) private purchases;
    uint256 public tokensAvailable;

    function ExternalCrowdsale(Mintable _token, uint256 _tokensAvailable)
        public
        onlyValid(_token)
        onlyNotZero(_tokensAvailable)
    {
        token = _token;
        tokensAvailable = _tokensAvailable;
    }

    event PurchaseRegistered(bytes32 indexed paymentId, address indexed purchaser, uint256 amount);
    event SaleScheduled(uint256 startBlock, uint256 endBlock);

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

    function registerPurchase(bytes32 paymentId, address purchaser, uint256 amount)
        public
        onlyOwner
        onlyActive
        onlyValid(purchaser)
        onlyNotZero(amount)
        onlyUniquePayment(paymentId)
    {
        purchases[paymentId] = Purchase({
            purchaser: purchaser,
            amount: amount
        });

        // SafeMath.sub() throws when result is negative
        tokensAvailable = tokensAvailable.sub(amount);

        token.mint(purchaser, amount);

        PurchaseRegistered(paymentId, purchaser, amount);
    }

    function isPaymentRegistered(bytes32 paymentId) public view returns (bool) {
        Purchase storage purchase = purchases[paymentId];
        return purchase.purchaser != address(0) && purchase.amount != 0;
    }

    function isActive() public view returns (bool) {
        return block.number >= startBlock && block.number <= endBlock;
    }
}
