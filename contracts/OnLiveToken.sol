pragma solidity 0.4.18;

import { ReleasableToken } from "./token/ReleasableToken.sol";
import { CappedMintableToken } from "./token/CappedMintableToken.sol";
import { BurnableToken } from "./token/BurnableToken.sol";


/**
 * @title OnLive Token
 * @author Jakub Stefanski
 */
contract OnLiveToken is ReleasableToken, CappedMintableToken, BurnableToken {

    string public name = "OnLive Token";
    string public symbol = "ONL";
    uint256 public decimals = 18;

    function OnLiveToken(uint256 _maxSupply)
        public
        CappedMintableToken(_maxSupply)
    {
        owner = msg.sender;
    }
}

