pragma solidity 0.4.24;

import { MintableToken } from "./MintableToken.sol";


/**
 * @title A token that can increase its supply to the specified limit
 * @author Jakub Stefanski (https://github.com/jstefanski)
 */
contract CappedMintableToken is MintableToken {

    /**
     * @dev Maximum supply that can be minted
     */
    uint256 public maxSupply;

    constructor(uint256 _maxSupply)
        public
        onlyNotZero(_maxSupply)
    {
        maxSupply = _maxSupply;
    }

    modifier onlyNotZero(uint256 value) {
        require(value != 0);
        _;
    }

    modifier onlyNotExceedingMaxSupply(uint256 supply) {
        require(supply <= maxSupply);
        _;
    }

    /**
     * @dev Create new tokens and transfer them to specified address
     * @dev Checks against capped max supply of token.
     * @param to address The address to transfer to
     * @param amount uint256 The amount to be minted
     */
    function mint(address to, uint256 amount)
        public
        onlyNotExceedingMaxSupply(totalSupply_.add(amount))
    {
        return MintableToken.mint(to, amount);
    }
}
