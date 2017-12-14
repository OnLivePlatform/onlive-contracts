pragma solidity 0.4.18;

import { ReleasableToken } from "./token/ReleasableToken.sol";
import { CappedMintableToken } from "./token/CappedMintableToken.sol";
import { BurnableToken } from "./token/BurnableToken.sol";
import { DescriptiveToken } from "./token/DescriptiveToken.sol";


/**
 * @title OnLive Token
 * @author Jakub Stefanski
 */
contract OnLiveToken is DescriptiveToken, ReleasableToken, CappedMintableToken, BurnableToken {

    function OnLiveToken(
        string _name,
        string _symbol,
        uint256 _maxSupply
    )
        public
        DescriptiveToken(_name, _symbol)
        CappedMintableToken(_maxSupply)
    {
        owner = msg.sender;
    }
}

