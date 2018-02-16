pragma solidity 0.4.18;

import { ERC20Basic } from "zeppelin-solidity/contracts/token/ERC20Basic.sol";
import { Ownable } from "zeppelin-solidity/contracts/ownership/Ownable.sol";
import { SafeMath } from "zeppelin-solidity/contracts/math/SafeMath.sol";


/**
 * @title Mintable token interface
 * @author Wojciech Harzowski (https://github.com/harzo)
 * @author Jakub Stefanski (https://github.com/jstefanski)
 */
contract MintableToken is ERC20Basic {
    function mint(address to, uint256 amount) public;
}


/**
 * @title Token pools registry
 * @dev Allows to register multiple pools of token with lockup period
 * @author Wojciech Harzowski (https://github.com/harzo)
 * @author Jakub Stefanski (https://github.com/jstefanski)
 */
contract TokenPool is Ownable {

    using SafeMath for uint256;
    
    /**
     * @dev Represents registered pool
     */
    struct Pool {
        uint256 availableAmount;
        uint256 lockTimestamp;
    }

    /**
     * @dev Address of mintable token instance
     */
    MintableToken public token;

    /**
     * @dev Indicates available token amounts for each pool
     */
    mapping (string => Pool) private pools;

    modifier onlyNotZero(uint256 amount) {
        require(amount != 0);
        _;
    }

    modifier onlySufficientAmount(string id, uint256 amount) {
        require(amount <= pools[id].availableAmount);
        _;
    }

    modifier onlyUnlockedPool(string id) {
        /* solhint-disable not-rely-on-time */
        require(block.timestamp > pools[id].lockTimestamp);
        /* solhint-enable not-rely-on-time */
        _;
    }

    modifier onlyUniquePool(string id) {
        require(pools[id].availableAmount == 0);
        _;
    }

    modifier onlyValid(address _address) {
        require(_address != address(0));
        _;
    }

    function TokenPool(MintableToken _token)
        public
        onlyValid(_token)
    {
        token = _token;
    }

    /**
     * @dev New pool registered
     * @param id string The unique pool id
     * @param amount uint256 The amount of available tokens
     */
    event PoolRegistered(string id, uint256 amount);

    /**
     * @dev Pool locked until the specified timestamp
     * @param id string The unique pool id
     * @param timestamp uint256 The expiration timestamp of the pool or zero
     */
    event PoolLocked(string id, uint256 timestamp);

    /**
     * @dev Register a new pool and mint its tokens
     * @param id string The id of the pool
     * @param availableAmount uint256 The amount of available tokens
     * @param lockTimestamp uint256 The optional lock timestamp as Unix Epoch (seconds from 1970),
     *                              leave zero if not applicable
     */
    function registerPool(string id, uint256 availableAmount, uint256 lockTimestamp)
        public
        onlyOwner
        onlyNotZero(availableAmount)
        onlyUniquePool(id)
    {
        pools[id] = Pool({
            availableAmount: availableAmount,
            lockTimestamp: lockTimestamp
        });

        token.mint(this, availableAmount);

        PoolRegistered(id, availableAmount);

        if (lockTimestamp > 0) {
            PoolLocked(id, lockTimestamp);
        }
    }

    /**
     * @dev Transfer given amount of tokens to specified address
     * @param to address The address to transfer to
     * @param id string The id of the pool
     * @param amount uint256 The amount of tokens to transfer
     */
    function transfer(string id, address to, uint256 amount)
        public
        onlyOwner
        onlyValid(to)
        onlyNotZero(amount)
        onlySufficientAmount(id, amount)
        onlyUnlockedPool(id)
    {
        pools[id].availableAmount = pools[id].availableAmount.sub(amount);
        require(token.transfer(to, amount));
    }

    /**
     * @dev Get available amount of tokens in the specified pool
     * @param id string The id of the pool
     * @return The available amount of tokens in the specified pool
     */
    function getAvailableAmount(string id)
        public
        view
        returns (uint256)
    {
        return pools[id].availableAmount;
    }

    /**
     * @dev Get lock timestamp of the pool or zero
     * @param id string The id of the pool
     * @return The lock expiration timestamp of the pool or zero if not specified
     */
    function getLockTimestamp(string id)
        public
        view
        returns (uint256)
    {
        return pools[id].lockTimestamp;
    }
}
