pragma solidity 0.4.18;

import { ReleasableToken } from "./token/ReleasableToken.sol";
import { CappedMintableToken } from "./token/CappedMintableToken.sol";
import { BurnableToken } from "./token/BurnableToken.sol";


/**
 * @title OnLive Token
 * @author Jakub Stefanski
 */
contract OnLiveToken is ReleasableToken, CappedMintableToken, BurnableToken {

    string public name;
    string public symbol;
    uint256 public decimals = 18;

    function OnLiveToken(
        string _name,
        string _symbol,
        uint256 _maxSupply
    )
        public
        CappedMintableToken(_maxSupply)
        onlyNotEmpty(_name)
        onlyNotEmpty(_symbol)
    {
        owner = msg.sender;
        name = _name;
        symbol = _symbol;
    }

    modifier onlyNotEmpty(string str) {
        require(bytes(str).length > 0);
        _;
    }
}

