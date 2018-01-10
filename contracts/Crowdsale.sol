pragma solidity 0.4.18;

import { SafeMath } from "zeppelin-solidity/contracts/math/SafeMath.sol";
import { Ownable } from "zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title Mintable token interface
 * @author Jakub Stefanski (https://github.com/jstefanski)
 */
contract Mintable {
    function mint(address to, uint256 amount) public;
}


/**
 * @title Crowdsale with constant price and limited supply
 * @author Jakub Stefanski (https://github.com/jstefanski)
 */
contract Crowdsale is Ownable {

    using SafeMath for uint256;

    /**
     * @dev Address of contribution wallet
     */
    address public wallet;

    /**
     * @dev Address of mintable token instance
     */
    Mintable public token;

    /**
     * @dev Price of token in Wei
     */
    uint256 public price;

    /**
     * @dev Current amount of tokens available for sale
     */
    uint256 public availableAmount;

    /**
     * @dev Minimum ETH value sent as contribution
     */
    uint256 public minValue;

    /**
     * @dev Start block of active sale (inclusive). Zero if not scheduled.
     */
    uint256 public startBlock;

    /**
     * @dev End block of active sale (inclusive). Zero if not scheduled.
     */
    uint256 public endBlock;

    function Crowdsale(
        address _wallet,
        Mintable _token,
        uint256 _price,
        uint256 _availableAmount,
        uint256 _minValue
    )
        public
        onlyValid(_wallet)
        onlyValid(_token)
        onlyNotZero(_price)
        onlyNotZero(_availableAmount)
    {
        wallet = _wallet;
        token = _token;
        price = _price;
        availableAmount = _availableAmount;
        minValue = _minValue;
    }

    /**
     * @dev Contribution is accepted
     * @param contributor address The recipient of the tokens
     * @param value uint256 The amount of contributed ETH
     * @param amount uint256 The amount of tokens
     */
    event ContributionAccepted(address indexed contributor, uint256 value, uint256 amount);

    /**
     * @dev Sale scheduled on the given blocks
     * @param startBlock uint256 The first block of active sale
     * @param endBlock uint256 The last block of active sale
     */
    event SaleScheduled(uint256 startBlock, uint256 endBlock);

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

    modifier onlySufficientValue(uint256 value) {
        require(value >= minValue);
        _;
    }

    modifier onlySufficientAvailableTokens(uint256 amount) {
        require(availableAmount >= amount);
        _;
    }

    function () public payable {
        acceptContribution(msg.sender, msg.value);
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

    function contribute() public payable returns (uint256) {
        return acceptContribution(msg.sender, msg.value);
    }

    /**
     * @dev Check whether sale is currently active
     */
    function isActive() public view returns (bool) {
        return block.number >= startBlock && block.number <= endBlock;
    }

    function acceptContribution(address contributor, uint256 value)
        private
        onlyActive
        onlyValid(contributor)
        onlySufficientValue(value)
        onlySufficientAvailableTokens(amount)
        returns (uint256)
    {
        uint256 amount = value.mul(1 ether).div(price);
        token.mint(contributor, amount);
        wallet.transfer(value);

        ContributionAccepted(contributor, value, amount);

        return amount;
    }
}
