pragma solidity 0.4.18;

import { SafeMath } from "zeppelin-solidity/contracts/math/SafeMath.sol";
import { StandardToken } from "zeppelin-solidity/contracts/token/StandardToken.sol";
import { Ownable } from "zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title A token that can decrease its supply
 * @author Jakub Stefanski
 */
contract BurnableToken is StandardToken, Ownable {

    using SafeMath for uint256;

    /**
     * @dev Address where burned tokens are Transferred.
     * @dev This is useful for blockchain explorers operating on Transfer event.
     */
    address public constant BURN_ADDRESS = address(0x0);

    /**
     * @dev Tokens destroyed from specified address
     * @param from address The burner
     * @param value uint256 The amount of destroyed tokens
     */
    event Burned(address from, uint256 value);

    /**
     * @dev Destroy tokens (reduce total supply)
     * @param value uint256 The amount of tokens to be burned
     */
    function burn(uint256 value) public {
        balances[msg.sender] = balances[msg.sender].sub(value);
        totalSupply = totalSupply.sub(value);

        Burned(msg.sender, value);
        Transfer(msg.sender, BURN_ADDRESS, value);
    }
}
