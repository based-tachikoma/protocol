pragma solidity ^0.4.21;

import "math.sol";
import "PriceSource.i.sol";
import "Accounting.sol";
import "Trading.sol";
import "Policy.sol";

contract MaxConcentration is DSMath, Policy {
    uint internal constant ONE_HUNDRED_PERCENT = 10 ** 18;  // 100%
    uint public maxConcentration;

    constructor(uint _maxConcentration) {
        require(
            _maxConcentration <= ONE_HUNDRED_PERCENT,
            "Max concentration cannot exceed 100%"
        );
        maxConcentration = _maxConcentration;
    }

    function rule(bytes4 sig, address[5] addresses, uint[3] values, bytes32 identifier)
        external
        view
        returns (bool)
    {
        address pricefeed = Hub(Trading(msg.sender).hub()).priceSource();
        address quoteAsset = PriceSourceInterface(pricefeed).getQuoteAsset();
        // Max concentration is only checked for non-quote assets
        if (quoteAsset == addresses[3]) { return true; }
        Accounting accounting = Accounting(Hub(Trading(msg.sender).hub()).accounting());
        uint concentration = mul(
            accounting.calcAssetGAV(addresses[3]),
            ONE_HUNDRED_PERCENT
        ) / accounting.calcGav();
        return concentration <= maxConcentration;
    }

    function position() external view returns (Applied) { return Applied.post; }
}
