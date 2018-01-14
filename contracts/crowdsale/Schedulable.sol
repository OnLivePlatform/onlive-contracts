pragma solidity 0.4.18;

import { Ownable } from "zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title One-time schedulable contract
 * @author Jakub Stefanski (https://github.com/jstefanski)
 */
contract Schedulable is Ownable {

    /**
     * @dev First block when contract is active (inclusive). Zero if not scheduled.
     */
    uint256 public startBlock;

    /**
     * @dev Last block when contract is active (inclusive). Zero if not scheduled.
     */
    uint256 public endBlock;

    /**
     * @dev Contract scheduled within given blocks
     * @param startBlock uint256 The first block when contract is active (inclusive)
     * @param endBlock uint256 The last block when contract is active (inclusive)
     */
    event Scheduled(uint256 startBlock, uint256 endBlock);

    modifier onlyNotZero(uint256 value) {
        require(value != 0);
        _;
    }

    modifier onlyScheduled() {
        require(isScheduled());
        _;
    }

    modifier onlyNotScheduled() {
        require(!isScheduled());
        _;
    }

    modifier onlyActive() {
        require(isActive());
        _;
    }

    modifier onlyNotActive() {
        require(!isActive());
        _;
    }

    /**
     * @dev Schedule contract activation for given block range
     * @param _startBlock uint256 The first block when contract is active (inclusive)
     * @param _endBlock uint256 The last block when contract is active (inclusive)
     */
    function schedule(uint256 _startBlock, uint256 _endBlock)
        public
        onlyOwner
        onlyNotScheduled
        onlyNotZero(_startBlock)
        onlyNotZero(_endBlock)
    {
        require(_startBlock < _endBlock);

        startBlock = _startBlock;
        endBlock = _endBlock;

        Scheduled(_startBlock, _endBlock);
    }

    /**
     * @dev Check whether activation is scheduled
     */
    function isScheduled() public view returns (bool) {
        return startBlock > 0 && endBlock > 0;
    }

    /**
     * @dev Check whether contract is currently active
     */
    function isActive() public view returns (bool) {
        return block.number >= startBlock && block.number <= endBlock;
    }
}
