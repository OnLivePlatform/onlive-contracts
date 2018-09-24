pragma solidity 0.4.24;

import { StandardToken } from "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import { Ownable } from "openzeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title ERC20 token with manual initial lock up period
 * @author Jakub Stefanski (https://github.com/jstefanski)
 */
contract ReleasableToken is StandardToken, Ownable {

    /**
     * @dev Controls whether token transfers are enabled
     * @dev If false, token is in transfer lock up period.
     */
    bool public released;

    /**
     * @dev Contract or EOA that can enable token transfers
     */
    address public releaseManager;

    /**
     * @dev Map of addresses allowed to transfer tokens despite the lock up period
     */
    mapping (address => bool) public isTransferManager;

    /**
     * @dev Specified address set as a Release Manager
     * @param addr address The approved address
     */
    event ReleaseManagerSet(address addr);

    /**
     * @dev Approves specified address as Transfer Manager
     * @param addr address The approved address
     */
    event TransferManagerApproved(address addr);

    /**
     * @dev Revokes specified address as Transfer Manager
     * @param addr address The denied address
     */
    event TransferManagerRevoked(address addr);

    /**
     * @dev Marks token as released (transferable)
     */
    event Released();

    /**
     * @dev Token is released or specified address is transfer manager
     */
    modifier onlyTransferableFrom(address from) {
        if (!released) {
            require(isTransferManager[from]);
        }

        _;
    }

    /**
     * @dev Specified address is transfer manager
     */
    modifier onlyTransferManager(address addr) {
        require(isTransferManager[addr]);
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
        require(released);
        _;
    }

    /**
     * @dev Token is in lock up period
     */
    modifier onlyNotReleased() {
        require(!released);
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

        emit ReleaseManagerSet(addr);
    }

    /**
     * @dev Approve specified address to make transfers in lock up period
     * @param addr address The approved Transfer Manager address
     */
    function approveTransferManager(address addr)
        public
        onlyOwner
        onlyNotReleased
    {
        isTransferManager[addr] = true;

        emit TransferManagerApproved(addr);
    }

    /**
     * @dev Forbid specified address to make transfers in lock up period
     * @param addr address The denied Transfer Manager address
     */
    function revokeTransferManager(address addr)
        public
        onlyOwner
        onlyTransferManager(addr)
        onlyNotReleased
    {
        delete isTransferManager[addr];

        emit TransferManagerRevoked(addr);
    }

    /**
     * @dev Release token and makes it transferable
     */
    function release()
        public
        onlyReleaseManager
        onlyNotReleased
    {
        released = true;

        emit Released();
    }

    /**
     * @dev Transfer token to a specified address
     * @dev Available only after token release
     * @param to address The address to transfer to
     * @param amount uint256 The amount to be transferred
     */
    function transfer(
        address to,
        uint256 amount
    )
        public
        onlyTransferableFrom(msg.sender)
        returns (bool)
    {
        return super.transfer(to, amount);
    }

    /**
     * @dev Transfer tokens from one address to another
     * @dev Available only after token release
     * @param from address The address which you want to send tokens from
     * @param to address The address which you want to transfer to
     * @param amount uint256 the amount of tokens to be transferred
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    )
        public
        onlyTransferableFrom(from)
        returns (bool)
    {
        return super.transferFrom(from, to, amount);
    }
}
