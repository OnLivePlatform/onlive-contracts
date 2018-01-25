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
     * @dev Address of mintable token instance
     */
    Mintable public token;

    /**
     * @dev Indicates available token amount for each pool
     */
    mapping (string => uint256) private availableAmount;

    modifier onlyNotZero(uint256 amount){
        require(amount != 0);
        _;
    }

    modifier onlySufficientAmount(string pool, uint256 amount) {
        require(amount <= availableAmount[pool]);
        _;
    }

    modifier onlyUnique(string pool) {
        require(availableAmount[pool] == 0);
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
     * @dev New pool registered
     * @param pool bytes32 A unique pool name
     * @param amount uint256 The amount of available tokens
     */
    event PoolRegistered(string pool, uint256 amount);

    /**
     * @dev Requested amount transferred
     * @param pool bytes32 The pool name
     * @param amount uint256 The amount of available tokens
     */
    event Transferred(address to, string pool, uint256 amount);

    /**
     * @dev Register pool with its token limit
     * @param name string The name of a pool
     * @param amount uint256 The amount of available tokens
     */
    function registerPool(string name, uint256 amount)
        public
        onlyOwner
        onlyNotZero(amount)
        onlyUnique(name)
    {
        availableAmount[name] = amount;
        token.mint(this, amount);
        PoolRegistered(name, amount);
    }

    /**
     * @dev Transfer given amount of tokens to to specified address
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
    {
        token.transfer(to, amount);
        availableAmount[pool] -= amount;
        Transferred(to, pool, amount);
    }

    /**
     * @dev Get available amount of tokens for given pool
     * @param pool string The name of pool
     * @return Available amount of tokens for given pool
     */
    function getAvailableAmount(string pool)
        public
        view
        returns (uint256)
    {
        return availableAmount[pool];
    }
}
