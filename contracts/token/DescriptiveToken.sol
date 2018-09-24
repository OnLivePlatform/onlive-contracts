pragma solidity 0.4.24;

import { BasicToken } from "openzeppelin-solidity/contracts/token/ERC20/BasicToken.sol";
import { Ownable } from "openzeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title A token with modifiable name and symbol
 * @author Jakub Stefanski (https://github.com/jstefanski)
 */
contract DescriptiveToken is BasicToken, Ownable {

    string public name;
    string public symbol;
    bool public isDescriptionFinalized;
    uint256 public decimals = 18;

    constructor(string _name, string _symbol)
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

    /**
     * @dev Further changes to name and symbol are forbidden
     */
    event DescriptionFinalized();

    modifier onlyNotEmpty(string str) {
        require(bytes(str).length > 0);
        _;
    }

    modifier onlyDescriptionNotFinalized() {
        require(!isDescriptionFinalized);
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
        onlyDescriptionNotFinalized
        onlyNotEmpty(_name)
        onlyNotEmpty(_symbol)
    {
        name = _name;
        symbol = _symbol;

        emit DescriptionChanged(name, symbol);
    }

    /**
     * @dev Prevents further changes to name and symbol
     */
    function finalizeDescription()
        public
        onlyOwner
        onlyDescriptionNotFinalized
    {
        isDescriptionFinalized = true;

        emit DescriptionFinalized();
    }
}
