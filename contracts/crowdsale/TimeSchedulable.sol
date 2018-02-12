pragma solidity 0.4.18;

import { Ownable } from "zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title One-time schedulable contract
 * @author Jakub Stefanski (https://github.com/jstefanski)
 * @author Dominik Króliczek (https://github.com/krolis)
 */
contract TimeSchedulable is Ownable {

    /**
     * @dev Contract activating timestamp. Zero if not scheduled.
     */
    uint256 public start;

    /**
     * @dev Contract inactivating timestamp. Zero if not scheduled.
     */
    uint256 public end;

    /**
     * @dev Contract scheduled within given timestamps
     * @param start uint256 Timestamp when contract activating
     * @param end uint256 Timestamp when contract inactivating
     */
    event Scheduled(uint256 start, uint256 end);

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
     * @dev Schedule contract activation for given timestamp range
     */
    function schedule(uint256 _start, uint256 _end)
        public
        onlyOwner
        onlyNotScheduled
        onlyNotZero(_start)
        onlyNotZero(_end)
    {
        require(_start < _end);

        start = _start;
        end = _end;

        Scheduled(_start, _end);
    }

    /**
     * @dev Check whether activation is scheduled
     */
    function isScheduled() public view returns (bool) {
        return start > 0 && end > 0;
    }

    /**
     * @dev Check whether contract is currently active
     */
    function isActive() public view returns (bool) {
        return now >= start && now <= end;
    }
}
