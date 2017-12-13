pragma solidity 0.4.18;

import { SafeMath } from "zeppelin-solidity/contracts/math/SafeMath.sol";
import { StandardToken } from "zeppelin-solidity/contracts/token/StandardToken.sol";
import { Ownable } from "zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title A token that can increase its supply in initial period
 * @author Jakub Stefanski
 */
contract MintableToken is StandardToken, Ownable {

    using SafeMath for uint256;

    /**
     * @dev Indicates whether creating tokens has finished
     */
    bool public isMintingFinished;

    /**
     * @dev List of addresses allowed to create tokens
     */
    mapping (address => bool) public mintingManagers;

    event Minted(address to, uint256 value);
    event MintingManagerAdded(address addr);
    event MintingManagerRemoved(address addr);
    event MintingFinished();

    modifier onlyMintingManager {
        require(mintingManagers[msg.sender]);
        _;
    }

    modifier onlyMintingNotFinished {
        require(!isMintingFinished);
        _;
    }

    /**
     * @dev Approve specified address to mint tokens
     * @param addr address The approved Minting Manager address
     */
    function addMintingManager(address addr)
        public
        onlyOwner
        onlyMintingNotFinished
    {
        mintingManagers[addr] = true;

        MintingManagerAdded(addr);
    }

    /**
     * @dev Deny specified address to mint tokens
     * @param addr address The denied Minting Manager address
     */
    function removeMintingManager(address addr)
        public
        onlyOwner
        onlyMintingNotFinished
    {
        delete mintingManagers[addr];

        MintingManagerRemoved(addr);
    }

    /**
     * @dev Create new tokens and transfer them to specified address
     * @param to address The address to transfer to
     * @param value uint256 The amount to be minted
     */
    function mint(address to, uint256 value)
        public
        onlyMintingManager
        onlyMintingNotFinished
    {
        totalSupply = totalSupply.add(value);
        balances[to] = balances[to].add(value);

        Minted(to, value);
        Transfer(this, to, value);
    }

    /**
     * @dev Prevent further creation of tokens
     */
    function finishMinting()
        public
        onlyOwner
        onlyMintingNotFinished
    {
        isMintingFinished = true;

        MintingFinished();
    }
}
