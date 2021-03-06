pragma solidity ^0.4.21;

import "Vault.i.sol";
import "Spoke.sol";
import "ERC20.i.sol";
import "Factory.sol";

/// @notice Dumb custody component
contract Vault is VaultInterface, Spoke {

    event Lock(bool status);

    bool public locked;

    modifier onlyUnlocked {
        require(!locked, "Vault is locked");
        _;
    }

    constructor(address _hub) Spoke(_hub) {}

    function lockdown() auth {
        locked = true;
        emit Lock(true);
    }

    function unlock() auth {
        locked = false;
        emit Lock(false);
    }

    function withdraw(address token, uint amount) onlyUnlocked auth {
        ERC20(token).transfer(msg.sender, amount);
    }
}

contract VaultFactory is Factory {
    function createInstance(address _hub) public returns (address) {
        address vault = new Vault(_hub);
        childExists[vault] = true;
        NewInstance(_hub, vault);
        return vault;
    }
}

