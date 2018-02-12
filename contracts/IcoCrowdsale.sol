pragma solidity 0.4.18;

import { SafeMath } from "zeppelin-solidity/contracts/math/SafeMath.sol";
import { TimeSchedulable } from "./crowdsale/TimeSchedulable.sol";


/**
 * @title Mintable token interface
 * @author Jakub Stefanski (https://github.com/jstefanski)
 */
contract Mintable {
    uint256 public decimals;

    function mint(address to, uint256 amount) public;
}


/**
 * @title ICO Crowdsale with price depending on timestamp and limited supply
 * @author Jakub Stefanski (https://github.com/jstefanski)
 * @author Dominik Króliczek (https://github.com/krolis)
 */
contract IcoCrowdsale is TimeSchedulable {

    using SafeMath for uint256;

    /**
     * @dev Token price period
     */
    struct PricePeriod {
        //todo consider timetamp as 32 bit and price 224 bit uints
        /**
        * @dev Price period start timestamp, inclusive
        */
        uint256 start;
        /**
        * @dev Price of token in Wei
        */
        uint256 price;
    }

    /**
     * @dev Address of contribution wallet
     */
    address public wallet;

    /**
     * @dev Address of mintable token instance
     */
    Mintable public token;

    /**
     * @dev Current amount of tokens available for sale
     */
    uint256 public availableAmount;

    /**
     * @dev Minimum ETH value sent as contribution
     */
    uint256 public minValue;

    /**
     * @dev Indicates whether contribution identified by bytes32 id is already registered
     */
    mapping (bytes32 => bool) public isContributionRegistered;

    PricePeriod[] public pricePeriods;

    function IcoCrowdsale(
        address _wallet,
        Mintable _token,
        uint256 _availableAmount,
        uint256 _minValue,
        uint256[1] _pricePeriodsStart,
        uint256[1] _pricePeriodsPrice
    )
        public
        onlyValid(_wallet)
        onlyValid(_token)
        onlyNotZero(_availableAmount)
        onlyNotZero(_pricePeriodsStart.length)
        onlyNotZero(_pricePeriodsPrice.length)
        onlyEqual(_pricePeriodsStart.length, _pricePeriodsPrice.length)
    {
        wallet = _wallet;
        token = _token;
        availableAmount = _availableAmount;
        minValue = _minValue;

        //setPeriods(_pricePeriodsStart, _pricePeriodsPrice);
    }

    /**
     * @dev Contribution is accepted
     * @param contributor address The recipient of the tokens
     * @param value uint256 The amount of contributed ETH
     * @param amount uint256 The amount of tokens
     */
    event ContributionAccepted(address indexed contributor, uint256 value, uint256 amount);

    /**
     * @dev Off-chain contribution registered
     * @param id bytes32 A unique contribution id
     * @param contributor address The recipient of the tokens
     * @param amount uint256 The amount of tokens
     */
    event ContributionRegistered(bytes32 indexed id, address indexed contributor, uint256 amount);

    modifier onlyValid(address addr) {
        require(addr != address(0));
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

    modifier onlyUniqueContribution(bytes32 id) {
        require(!isContributionRegistered[id]);
        _;
    }

    modifier onlyEqual(uint256 a, uint256 b){
        require(a == b);
        _;
    }

    /**
     * @dev Accept ETH transfers as contributions
     */
    function () public payable {
        acceptContribution(msg.sender, msg.value);
    }

    /**
    * @dev Set price for price period specified by periodIndex
    */
    function setPrice(uint256 periodIndex, uint256 price)
        public
        onlyOwner
        onlyNotScheduled
    {
        require(periodIndex < pricePeriods.length);
        pricePeriods[periodIndex].price = price;
        //todo event?
    }

    /**
     * @dev Contribute ETH in exchange for tokens
     * @param contributor address The address that receives tokens
     */
    function contribute(address contributor) public payable returns (uint256) {
        return acceptContribution(contributor, msg.value);
    }

    /**
     * @dev Register contribution with given id
     * @param id bytes32 A unique contribution id
     * @param contributor address The recipient of the tokens
     * @param amount uint256 The amount of tokens
     */
    function registerContribution(bytes32 id, address contributor, uint256 amount)
        public
        onlyOwner
        onlyActive
        onlyValid(contributor)
        onlyNotZero(amount)
        onlyUniqueContribution(id)
    {
        isContributionRegistered[id] = true;
        mintTokens(contributor, amount);

        ContributionRegistered(id, contributor, amount);
    }

    /**
     * @dev Calculate amount of ONL tokens received for given ETH value
     * @param value uint256 Contribution value in ETH
     * @return uint256 Amount of received ONL tokens
     */
    function calculateContribution(uint256 value) public view returns (uint256) {
        // todo
        return value.mul(10 ** token.decimals()).div(1146600000000000);
    }

    function setPeriods(uint256[] _pricePeriodsStart, uint256[] _pricePeriodsPrice)
        internal
    {
        uint256 prevStart = 0;
        for(uint256 i  = 0; i < _pricePeriodsStart.length; i++){
            require(_pricePeriodsStart[i] > prevStart);
            require(_pricePeriodsPrice[i] > 0);
            pricePeriods.push(
                PricePeriod({
                start: _pricePeriodsStart[i],
                price: _pricePeriodsPrice[i]
                })
            );
            prevStart = _pricePeriodsStart[i];
        }
    }

    function acceptContribution(address contributor, uint256 value)
        private
        onlyActive
        onlyValid(contributor)
        onlySufficientValue(value)
        returns (uint256)
    {
        uint256 amount = calculateContribution(value);
        mintTokens(contributor, amount);

        wallet.transfer(value);

        ContributionAccepted(contributor, value, amount);

        return amount;
    }

    function mintTokens(address to, uint256 amount)
        private
        onlySufficientAvailableTokens(amount)
    {
        availableAmount = availableAmount.sub(amount);
        token.mint(to, amount);
    }
}
