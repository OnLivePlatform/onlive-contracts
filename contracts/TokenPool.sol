pragma solidity 0.4.18;

import { ERC20Basic } from "zeppelin-solidity/contracts/token/ERC20Basic.sol";
import { Ownable } from "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title Mintable token interface
 * @author Wojciech Harzowski (https://github.com/harzo)
 */
contract Mintable is ERC20Basic{
    function mint(address to, uint256 amount) public;
}

/**
 * @title TokenPool token interface
 * @author Wojciech Harzowski (https://github.com/harzo)
 */
contract TokenPool is Ownable {

    /**
     * @dev Represents registered pool
     */
    struct Pool {
        uint256 amount;
        uint256 lockTimestamp;
    }

    /**
     * @dev Address of mintable token instance
     */
    Mintable public token;

    /**
     * @dev Indicates available token amount for each pool
     */
    mapping (string => Pool) private poolRegister;


    modifier onlyNotZero(uint256 amount){
        require(amount != 0);
        _;
    }

    modifier onlySufficientAmount(string pool, uint256 amount) {
        require(amount <= poolRegister[pool].amount);
        _;
    }

    modifier onlyUnlocked(string pool) {
        require(now > poolRegister[pool].lockTimestamp);
        _;
    }

    modifier onlyUnique(string pool) {
        require(poolRegister[pool].amount == 0);
    _;
    }

    modifier onlyValid(address _address) {
        require(_address != 0);
        _;
    }

    function TokenPool(Mintable _token)
        public
    {
        token = _token;
    }

    /**
     * @dev Registered pool locked until the timestamp
     * @param pool bytes32 The pool name
     * @param timestamp uint256 Lock's expiration timestamp
     */
    event PoolLocked(string pool, uint256 timestamp);

    /**
     * @dev New pool registered
     * @param pool bytes32 A unique pool name
     * @param amount uint256 The amount of available tokens
     */
    event PoolRegistered(string pool, uint256 amount);

    /**
     * @dev Requested amount transferred
     * @param pool bytes32 The pool name
     * @param amount uint256 The amount of transferred tokens
     */
    event Transferred(address to, string pool, uint256 amount);

    /**
     * @dev Register pool with its token availability
     * @param name string The name of a pool
     * @param amount uint256 The amount of available tokens
     * @param lockTimestamp uint256 Optional lock timestamp in milliseconds
     */
    function registerPool(string name, uint256 amount, uint256 lockTimestamp)
        public
        onlyOwner
        onlyNotZero(amount)
        onlyUnique(name)
    {
        poolRegister[name] = Pool(amount, 0);
        token.mint(this, amount);
        PoolRegistered(name, amount);

        if(lockTimestamp > 0) lockPool(name, lockTimestamp);
    }

    /**
     * @dev Transfer given amount of tokens to specified address
     * @param to address The address to transfer to
     * @param pool string The name of pool
     * @param amount uint256 The amount of tokens to transfer
     */
    function transfer(address to, string pool, uint256 amount)
        public
        onlyOwner
        onlyValid(to)
        onlyNotZero(amount)
        onlySufficientAmount(pool, amount)
        onlyUnlocked(pool)
    {
        token.transfer(to, amount);
        poolRegister[pool].amount -= amount;
        Transferred(to, pool, amount);
    }

    /**
     * @dev Get available amount of pool's tokens
     * @param pool string The name of pool
     * @return Available amount of tokens
     */
    function getAvailableAmount(string pool)
        public
        view
        returns (uint256)
    {
        return poolRegister[pool].amount;
    }

    /**
     * @dev Get pool's lock timestamp
     * @param pool string The name of pool
     * @return Pool's lock expiration timestamp
     */
    function getLockTimestamp(string pool)
        public
        view
        returns (uint256)
    {
        return poolRegister[pool].lockTimestamp;
    }

    /**
     * @dev Sets pool's lock timestamp
     * @param name string The name of a pool
     * @param lockTimestamp uint256 Lock timestamp in milliseconds
     */
    function lockPool(string name, uint256 lockTimestamp)
        internal
    {
        poolRegister[name].lockTimestamp = lockTimestamp;
        PoolLocked(name, lockTimestamp);
    }
}
