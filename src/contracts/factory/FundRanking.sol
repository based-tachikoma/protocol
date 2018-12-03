pragma solidity ^0.4.21;
pragma experimental ABIEncoderV2;

import "./FundFactory.sol";
import "../fund/hub/Hub.sol";
import "../fund/accounting/Accounting.i.sol";
import "../fund/shares/Shares.sol";

/// @title FundRanking Contract
/// @author Melonport AG <team@melonport.com>
/// @notice Reading contract to enable fund ranking
contract FundRanking {
    /**
    @notice Returns an array of fund addresses and associated arrays of share prices and creation times
    @dev Return value only w.r.t. specified version contract
    @return {
      "fundAddrs": "Array of addresses of Melon Funds",
      "sharePrices": "Array of uints containing share prices of above Melon Fund addresses"
      "creationTimes": "Array of uints representing the unix timestamp for creation of each Fund"
      "names": "Array of bytes32 representing the names of the addresses of Melon Funds"
    }
    */
    function getFundDetails(address ofFundFactory)
        public
        view
        returns(
            address[],
            uint[],
            uint[],
            string[]
        )
    {
        FundFactory factory = FundFactory(ofFundFactory);
        uint nofFunds = factory.getLastFundId() + 1;
        address[] memory fundAddrs = new address[](nofFunds);
        uint[] memory sharePrices = new uint[](nofFunds);
        uint[] memory creationTimes = new uint[](nofFunds);
        string[] memory names = new string[](nofFunds);

        for (uint i = 0; i < nofFunds; i++) {
            address hubAddress = factory.getFundById(i);
            Hub hub = Hub(hubAddress);
            fundAddrs[i] = hubAddress;
            sharePrices[i] = AccountingInterface(hub.accounting()).calcSharePrice();
            creationTimes[i] = Shares(hub.shares()).creationTime();
            names[i] = hub.name();
        }
        return (fundAddrs, sharePrices, creationTimes, names);
    }
}