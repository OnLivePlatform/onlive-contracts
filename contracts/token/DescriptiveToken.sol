pragma solidity 0.4.18;

import { Ownable } from "zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title A token with standard description properties
 * @author Jakub Stefanski
 */
contract DescriptiveToken is Ownable {

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

    event DescriptionChanged(string name, string symbol);

    modifier onlyNotEmpty(string str) {
        require(bytes(str).length > 0);
        _;
    }

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
