pragma solidity 0.4.18;

import { SafeMath } from "zeppelin-solidity/contracts/math/SafeMath.sol";
import { BasicToken } from "zeppelin-solidity/contracts/token/BasicToken.sol";


/**
 * @title A token that can decrease its supply
 * @author Jakub Stefanski
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

    /**
     * @dev Destroy tokens (reduce total supply)
     * @param amount uint256 The amount of tokens to be burned
     */
    function burn(uint256 amount) public {
        balances[msg.sender] = balances[msg.sender].sub(amount);
        totalSupply = totalSupply.sub(amount);

        Burned(msg.sender, amount);
        Transfer(msg.sender, BURN_ADDRESS, amount);
    }
}
