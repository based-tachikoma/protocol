pragma solidity ^0.4.21;

import "./Policy.sol";

contract BooleanPolicy is Policy {
    bool allowed;

    function rule(bytes4 sig, address[5] addresses, uint[3] values, bytes32 identifier) external view returns (bool) {
        return allowed;
    }

    function position() external view returns (uint) {
        return 0;
    }
}

contract TruePolicy is BooleanPolicy {
    function TruePolicy() public {
        allowed = true;
    }
}

contract FalsePolicy is BooleanPolicy {
    function FalsePolicy() public {
        allowed = false;
    }
}
