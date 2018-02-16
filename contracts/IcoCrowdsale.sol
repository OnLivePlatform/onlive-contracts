pragma solidity 0.4.18;

import { SafeMath } from "zeppelin-solidity/contracts/math/SafeMath.sol";
import { Ownable } from "zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title Mintable token interface
 * @author Jakub Stefanski (https://github.com/jstefanski)
 * @author Wojciech Harzowski (https://github.com/harzo)
 * @author Dominik Kroliczek (https://github.com/kruligh)
 */
contract Mintable {
    uint256 public decimals;

    function mint(address to, uint256 amount) public;
    function transfer(address to, uint256 amount) public;
}


/**
 * @title ICO Crowdsale with price depending on timestamp and limited supply
 * @author Jakub Stefanski (https://github.com/jstefanski)
 * @author Wojciech Harzowski (https://github.com/harzo)
 * @author Dominik Kroliczek (https://github.com/kruligh)
 */
contract IcoCrowdsale is Ownable {

    using SafeMath for uint256;

    /**
     * @dev Structure representing stage of crowdsale
     */
    struct Stage {
        /**
        * @dev Start timestamp, inclusive
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

    /**
     * @dev Stores stages of sale in chronological order
     */
    Stage[] public stages;

    /**
    * @dev Timestamp of sale end
    */
    uint256 public end;

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

    modifier onlyEqual(uint256 a, uint256 b) {
        require(a == b);
        _;
    }

    modifier onlyActive() {
        require(isActive());
        _;
    }

    modifier onlyScheduledStages() {
        require(stages.length > 0);
        _;
    }

    modifier onlyNotZero(uint256 a) {
        require(a != 0);
        _;
    }

    modifier onlyNotScheduledCrowdsaleEnd() {
        require(!isCrowdsaleEndScheduled());
        _;
    }

    function IcoCrowdsale(
        address _wallet,
        Mintable _token,
        uint256 _minValue
    )
        public
        onlyValid(_wallet)
        onlyValid(_token)
    {
        wallet = _wallet;
        token = _token;
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

    /**
     * @dev Sale stage scheduled with given start and price
     * @param start uint256 Timestamp when stage activating, inclusive
     * @param price uint256 The price active during stage
     */
    event StageScheduled(uint256 start, uint256 price);

    /**
     * @dev Sale end scheduled
     * @param end uint256 Timestamp when sale ends
     */
    event CrowdsaleEndScheduled(uint256 end);

    /**
     * @dev Accept ETH transfers as contributions
     */
    function () public payable {
        acceptContribution(msg.sender, msg.value);
    }

    function setAvailableAmount(uint256 _availableAmount)
        public
        onlyOwner
        onlyNotZero(amount)
    {
        availableAmount = _availableAmount;
        token.mint(wallet, availableAmount);
    }

    /**
     * @dev Schedule crowdsale stage
     * @param _start uint256 Timestamp when stage activating, inclusive
     * @param _price uint256 The price active during stage
     */
    function scheduleStage(uint256 _start, uint _price)
        public
        onlyOwner
        onlyNotScheduledCrowdsaleEnd
        onlyNotZero(_start)
        onlyNotZero(_price)
    {
        if (stages.length > 0) {
            require(_start > stages[stages.length - 1].start);
        }

        stages.push(
            Stage({
                start: _start,
                price: _price
            })
        );

        StageScheduled(_start, _price);
    }

    /**
     * @dev Schedule crowdsale end
     * @param _end uint256 Timestamp end of crowdsale, inclusive
     */
    function scheduleCrowdsaleEnd(uint256 _end)
        public
        onlyOwner
        onlyScheduledStages
        onlyNotZero(_end)
    {
        end = _end;
        CrowdsaleEndScheduled(_end);
    }

    /**
     * @dev Contribute ETH in exchange for tokens
     * @param contributor address The address that receives tokens
     * @return uint256 Amount of received ONL tokens
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
    function calculateContribution(uint256 value)
        public
        view
        returns (uint256)
    {
        return value.mul(10 ** token.decimals()).div(getActualPrice());
    }

    /**
     * @dev Returns price of active stage
     * @return uint256 Current price if active, otherwise 0
     */
    function getActualPrice()
        public
        view
        returns (uint256)
    {
        if (isActive()) {
            for (uint256 i = stages.length - 1; i >= 0; i--) {
                if (now >= stages[i].start) {
                    return stages[i].price;
                }
            }
        } else {
            return 0;
        }
    }

    /**
     * @dev Check whether sale end is scheduled
     * @return boolean
     */
    function isCrowdsaleEndScheduled() public view returns (bool) {
        return end != 0;
    }

    /**
    * @dev Check whether contract is currently active
    * @return boolean
    */
    function isActive() public view returns (bool) {
        return stages.length > 0 && now >= stages[0].start && now <= end;
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
        token.transfer(to, amount);
    }
}
