pragma solidity 0.4.18;

import { SafeMath } from "zeppelin-solidity/contracts/math/SafeMath.sol";
import { BasicToken } from "zeppelin-solidity/contracts/token/BasicToken.sol";
import { Ownable } from "zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title A token that can increase its supply in initial period
 * @author Jakub Stefanski (https://github.com/jstefanski)
 */
contract MintableToken is BasicToken, Ownable {

    using SafeMath for uint256;

    /**
     * @dev Address from which minted tokens are Transferred.
     * @dev This is useful for blockchain explorers operating on Transfer event.
     */
    address public constant MINT_ADDRESS = address(0x0);

    /**
     * @dev Indicates whether creating tokens has finished
     */
    bool public mintingFinished;

    /**
     * @dev Addresses allowed to create tokens
     */
    mapping (address => bool) public isMintingManager;

    /**
     * @dev Tokens minted to specified address
     * @param to address The receiver of the tokens
     * @param amount uint256 The amount of tokens
     */
    event Minted(address indexed to, uint256 amount);

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
        require(isMintingManager[addr]);
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
        isMintingManager[addr] = true;

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
        delete isMintingManager[addr];

        MintingManagerRevoked(addr);
    }

    /**
     * @dev Create new tokens and transfer them to specified address
     * @param to address The address to transfer to
     * @param amount uint256 The amount to be minted
     */
    function mint(address to, uint256 amount)
        public
        onlyMintingManager(msg.sender)
        onlyMintingNotFinished
    {
        totalSupply = totalSupply.add(amount);
        balances[to] = balances[to].add(amount);

        Minted(to, amount);
        Transfer(MINT_ADDRESS, to, amount);
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
