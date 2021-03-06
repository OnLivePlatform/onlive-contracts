pragma solidity 0.4.24;

import { SafeMath } from "openzeppelin-solidity/contracts/math/SafeMath.sol";
import { BasicToken } from "openzeppelin-solidity/contracts/token/ERC20/BasicToken.sol";


/**
 * @title A token that can decrease its supply
 * @author Jakub Stefanski (https://github.com/jstefanski)
 */
contract BurnableToken is BasicToken {

    using SafeMath for uint256;

    /**
     * @dev Address where burned tokens are Transferred.
     * @dev This is useful for blockchain explorers operating on Transfer event.
     */
    address public constant BURN_ADDRESS = address(0x0);

    /**
     * @dev Tokens destroyed from specified address
     * @param from address The burner
     * @param amount uint256 The amount of destroyed tokens
     */
    event Burned(address indexed from, uint256 amount);

    modifier onlyHolder(uint256 amount) {
        require(balances[msg.sender] >= amount);
        _;
    }

    /**
     * @dev Destroy tokens (reduce total supply)
     * @param amount uint256 The amount of tokens to be burned
     */
    function burn(uint256 amount)
        public
        onlyHolder(amount)
    {
        balances[msg.sender] = balances[msg.sender].sub(amount);
        totalSupply_ = totalSupply_.sub(amount);

        emit Burned(msg.sender, amount);
        emit Transfer(msg.sender, BURN_ADDRESS, amount);
    }
}
