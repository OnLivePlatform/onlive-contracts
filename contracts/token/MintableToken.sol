pragma solidity 0.4.18;

import { SafeMath } from "zeppelin-solidity/contracts/math/SafeMath.sol";
import { BasicToken } from "zeppelin-solidity/contracts/token/BasicToken.sol";
import { Ownable } from "zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title A token that can increase its supply in initial period
 * @author Jakub Stefanski
 */
contract MintableToken is BasicToken, Ownable {

    using SafeMath for uint256;

    /**
     * @dev Indicates whether creating tokens has finished
     */
    bool public mintingFinished;

    /**
     * @dev List of addresses allowed to create tokens
     */
    mapping (address => bool) public mintingManagers;

    /**
     * @dev Tokens minted to specified address
     * @param to address The receiver of the tokens
     * @param value uint256 The amount of tokens
     */
    event Minted(address indexed to, uint256 value);

    /**
     * @dev Approves specified address as a Minting Manager
     * @param addr address The approved address
     */
    event MintingManagerApproved(address addr);

    /**
     * @dev Revokes specified address as a Minting Manager
     * @param addr address The revoked address
     */
    event MintingManagerRevoked(address addr);

    /**
     * @dev Creation of tokens finished
     */
    event MintingFinished();

    modifier onlyMintingManager(address addr) {
        require(mintingManagers[addr]);
        _;
    }

    modifier onlyMintingNotFinished {
        require(!mintingFinished);
        _;
    }

    /**
     * @dev Approve specified address to mint tokens
     * @param addr address The approved Minting Manager address
     */
    function approveMintingManager(address addr)
        public
        onlyOwner
        onlyMintingNotFinished
    {
        mintingManagers[addr] = true;

        MintingManagerApproved(addr);
    }

    /**
     * @dev Forbid specified address to mint tokens
     * @param addr address The denied Minting Manager address
     */
    function revokeMintingManager(address addr)
        public
        onlyOwner
        onlyMintingManager(addr)
        onlyMintingNotFinished
    {
        delete mintingManagers[addr];

        MintingManagerRevoked(addr);
    }

    /**
     * @dev Create new tokens and transfer them to specified address
     * @param to address The address to transfer to
     * @param value uint256 The amount to be minted
     */
    function mint(address to, uint256 value)
        public
        onlyMintingManager(msg.sender)
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
        mintingFinished = true;

        MintingFinished();
    }
}
