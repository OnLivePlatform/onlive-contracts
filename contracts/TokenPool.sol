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

    modifier onlyUnique(string pool){
        require(availableAmount[pool] == 0);
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
    event PoolRegistered(string indexed pool, uint256 amount);

    /**
     * @dev Register pool with its token limit
     * @param pool string The name of pool
     * @param amount uint256 The amount of available tokens
     */
    function register(string pool, uint256 amount)
    public
    onlyOwner
    onlyUnique(pool)
    {
        availableAmount[pool] = amount;
        token.mint(this, amount);
        PoolRegistered(pool, amount);
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
