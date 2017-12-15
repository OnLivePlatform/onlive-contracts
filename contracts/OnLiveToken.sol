pragma solidity 0.4.18;

import { ReleasableToken } from "./token/ReleasableToken.sol";
import { CappedMintableToken } from "./token/CappedMintableToken.sol";
import { BurnableToken } from "./token/BurnableToken.sol";
import { DescriptiveToken } from "./token/DescriptiveToken.sol";


/**
 * @title OnLive Token
 * @author Jakub Stefanski
 * @dev Implements ERC20 interface
 * @dev Mintable by selected addresses until sale finishes
 * @dev A cap on total supply of tokens
 * @dev Burnable by anyone
 * @dev Manual lock-up period (non-transferable) with a non-reversible release by the selected address
 * @dev Modifiable symbol and name in case of collision
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

