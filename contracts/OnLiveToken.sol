pragma solidity 0.4.18;

import { ReleasableToken } from "./token/ReleasableToken.sol";
import { MintableToken } from "./token/MintableToken.sol";
import { BurnableToken } from "./token/BurnableToken.sol";


/**
 * @title OnLive Token
 * @author Jakub Stefanski
 */
contract OnLiveToken is ReleasableToken, MintableToken, BurnableToken {

    string public name = "OnLive Token";
    string public symbol = "ONL";
    uint256 public decimals = 18;

    function OnLiveToken() public {
        owner = msg.sender;
    }
}

