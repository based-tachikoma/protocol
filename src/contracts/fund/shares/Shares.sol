pragma solidity ^0.4.21;


import "./Shares.i.sol";
import "../hub/Spoke.sol";
import "../../dependencies/token/StandardToken.sol";
import "../../factory/Factory.sol";

contract Shares is Spoke, StandardToken, SharesInterface {
    string public symbol;
    string public name;
    uint8 public decimals;
    uint public creationTime;

    constructor(address _hub) Spoke(_hub) {
        name = hub.name();
        symbol = "MLNF";
        decimals = 18;
        creationTime = block.timestamp;
    }

    function createFor(address who, uint amount) auth {
        _mint(who, amount);
    }

    function destroyFor(address who, uint amount) auth {
        _burn(who, amount);
    }

    function transfer(address to, uint amount) public returns (bool) {
        revert("Unimplemented");
    }

    function transferFrom(
        address from,
        address to,
        uint amount
    )
        public
        returns (bool)
    {
        revert("Unimplemented");
    }

    function approve(address spender, uint amount) public returns (bool) {
        revert("Unimplemented");
    }

    function increaseApproval(
        address spender,
        uint amount
    )
        public
        returns (bool)
    {
        revert("Unimplemented");
    }

    function decreaseApproval(
        address spender,
        uint amount
    )
        public
        returns (bool)
    {
        revert("Unimplemented");
    }
}

contract SharesFactory is Factory {
    function createInstance(address _hub) public returns (address) {
        address shares = new Shares(_hub);
        childExists[shares] = true;
        return shares;
    }
}

