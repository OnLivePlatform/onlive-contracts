pragma solidity 0.4.18;

import { StandardToken } from "zeppelin-solidity/contracts/token/StandardToken.sol";
import { Ownable } from "zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title ERC20 token with manual initial lock up period
 * @author Jakub Stefanski
 */
contract ReleasableToken is StandardToken, Ownable {

    /**
     * @dev Controls whether token transfers are enabled
     * @dev If false, token is in transfer lock up period.
     */
    bool public isReleased;

    /**
     * @dev Contract or EOA that can enable token transfers
     */
    address public releaseManager;

    /**
     * @dev Map of addresses allowed to transfer tokens despite the lock up period
     */
    mapping (address => bool) public transferManagers;

    /**
     * @dev Token is released or specified address is transfer manager
     */
    modifier onlyTransferableFrom(address from) {
        if (!isReleased) {
            require(transferManagers[from]);
        }

        _;
    }

    /**
     * @dev Sender is release manager
     */
    modifier onlyReleaseManager() {
        require(msg.sender == releaseManager);
        _;
    }

    /**
     * @dev Token is released (transferable)
     */
    modifier onlyReleased() {
        require(isReleased);
        _;
    }

    /**
     * @dev Token is in lock up period
     */
    modifier onlyNotReleased() {
        require(!isReleased);
        _;
    }

    /**
     * @dev Set release manager if token not released yet
     * @param addr address The new Release Manager address
     */
    function setReleaseManager(address addr)
        public
        onlyOwner
        onlyNotReleased
    {
        releaseManager = addr;
    }

    /**
     * @dev Approve specified address to make transfers in lock up period
     * @param addr address The approved Transfer Manager address
     */
    function addTransferManager(address addr)
        public
        onlyOwner
        onlyNotReleased
    {
        transferManagers[addr] = true;
    }

    /**
     * @dev Forbid specified address to make transfers in lock up period
     * @param addr address The denied Transfer Manager address
     */
    function removeTransferManager(address addr)
        public
        onlyOwner
        onlyNotReleased
    {
        delete transferManagers[addr];
    }

    /**
     * @dev Release token and makes it transferable
     */
    function release() public onlyReleaseManager onlyNotReleased {
        isReleased = true;
    }

    /**
     * @dev Transfer token to a specified address
     * @dev Available only after token release
     * @param to address The address to transfer to
     * @param value uint256 The amount to be transferred
     */
    function transfer(
        address to,
        uint256 value
    )
        public
        onlyTransferableFrom(msg.sender)
        returns (bool)
    {
        return super.transfer(to, value);
    }

    /**
     * @dev Transfer tokens from one address to another
     * @dev Available only after token release
     * @param from address The address which you want to send tokens from
     * @param to address The address which you want to transfer to
     * @param value uint256 the amount of tokens to be transferred
     */
    function transferFrom(
        address from,
        address to,
        uint256 value
    )
        public
        onlyTransferableFrom(from)
        returns (bool)
    {
        return super.transferFrom(from, to, value);
    }
}
