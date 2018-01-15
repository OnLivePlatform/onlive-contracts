pragma solidity 0.4.18;

import { SafeMath } from "zeppelin-solidity/contracts/math/SafeMath.sol";
import { Schedulable } from "./crowdsale/Schedulable.sol";


/**
 * @title Mintable token interface
 * @author Jakub Stefanski (https://github.com/jstefanski)
 */
contract Mintable {
    function mint(address to, uint256 amount) public;
}


/**
 * @title Pre-ICO Crowdsale with constant price and limited supply
 * @author Jakub Stefanski (https://github.com/jstefanski)
 */
contract PreIcoCrowdsale is Schedulable {

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
     * @dev Current amount of tokens available for sale
     */
    uint256 public availableAmount;

    /**
     * @dev Price of token in Wei
     */
    uint256 public price;

    /**
     * @dev Minimum ETH value sent as contribution
     */
    uint256 public minValue;

    /**
     * @dev Indicates whether contribution identified by bytes32 id is already registered
     */
    mapping (bytes32 => bool) public isContributionRegistered;

    function PreIcoCrowdsale(
        address _wallet,
        Mintable _token,
        uint256 _availableAmount,
        uint256 _price,
        uint256 _minValue
    )
        public
        onlyValid(_wallet)
        onlyValid(_token)
        onlyNotZero(_availableAmount)
        onlyNotZero(_price)
    {
        wallet = _wallet;
        token = _token;
        availableAmount = _availableAmount;
        price = _price;
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

    /**
     * @dev Accept ETH transfers as contributions
     */
    function () public payable {
        acceptContribution(msg.sender, msg.value);
    }

    /**
     * @dev Set funds wallet address
     * @param _wallet address The funds wallet address
     */
    function setWallet(address _wallet)
        public
        onlyOwner
        onlyValid(_wallet)
    {
        wallet = _wallet;
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

        transferTokens(contributor, amount);

        ContributionRegistered(id, contributor, amount);
    }

    /**
     * @dev Calculate amount of ONL tokens received for given ETH value
     * @param value uint256 Contribution value in ETH
     * @return uint256 Amount of received ONL tokens
     */
    function calculateContribution(uint256 value) public view returns (uint256) {
        return value.mul(1 ether).div(price);
    }

    function acceptContribution(address contributor, uint256 value)
        private
        onlyActive
        onlyValid(contributor)
        onlySufficientValue(value)
        returns (uint256)
    {
        uint256 amount = calculateContribution(value);
        transferTokens(contributor, amount);

        wallet.transfer(value);

        ContributionAccepted(contributor, value, amount);

        return amount;
    }

    function transferTokens(address to, uint256 amount)
        private
        onlySufficientAvailableTokens(amount)
    {
        availableAmount = availableAmount.sub(amount);
        token.mint(to, amount);
    }
}
