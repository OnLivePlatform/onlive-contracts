pragma solidity 0.4.18;

import { BasicToken } from "zeppelin-solidity/contracts/token/BasicToken.sol";
import { Ownable } from "zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title A token with modifiable name and symbol
 * @author Jakub Stefanski
 */
contract DescriptiveToken is BasicToken, Ownable {

    string public name;
    string public symbol;
    uint256 public decimals = 18;

    function DescriptiveToken(
        string _name,
        string _symbol
    )
        public
        onlyNotEmpty(_name)
        onlyNotEmpty(_symbol)
    {
        name = _name;
        symbol = _symbol;
    }

    /**
     * @dev Logs change of token name and symbol
     * @param name string The new token name
     * @param symbol string The new token symbol
     */
    event DescriptionChanged(string name, string symbol);

    modifier onlyNotEmpty(string str) {
        require(bytes(str).length > 0);
        _;
    }

    /**
     * @dev Change name and symbol of tokens
     * @dev May be used in case of symbol collisions in exchanges.
     * @param _name string A new token name
     * @param _symbol string A new token symbol
     */
    function changeDescription(string _name, string _symbol)
        public
        onlyOwner
        onlyNotEmpty(_name)
        onlyNotEmpty(_symbol)
    {
        name = _name;
        symbol = _symbol;

        DescriptionChanged(name, symbol);
    }
}