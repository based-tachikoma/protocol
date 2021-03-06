pragma solidity ^0.4.21;
pragma experimental ABIEncoderV2;

import "./ExchangeAdapterInterface.sol";
import "../thirdparty/CentralizedExchangeBridge.sol";
import "../../Fund.sol";
import "../../dependencies/DBC.sol";
import "../../assets/Asset.sol";
import "../../dependencies/math.sol";

contract CentralizedAdapter is ExchangeAdapterInterface, DBC, DSMath {

    // NON-CONSTANT METHODS

    /// @dev Make an order on the centralized exchange bridge
    function makeOrder(
        address targetExchange,
        address[6] orderAddresses,
        uint[8] orderValues,
        bytes32 identifier,
        bytes makerAssetData,
        bytes takerAssetData,
        bytes signature
    )
        pre_cond(Fund(address(this)).owner() == msg.sender)
        pre_cond(!Fund(address(this)).isShutDown())
    {
        require(Fund(address(this)).owner() == msg.sender);
        require(!Fund(address(this)).isShutDown());

        address makerAsset = orderAddresses[2];
        address takerAsset = orderAddresses[3];
        uint makerQuantity = orderValues[0];
        uint takerQuantity = orderValues[1];

        require(Asset(makerAsset).approve(targetExchange, makerQuantity));

        uint orderId = CentralizedExchangeBridge(targetExchange).makeOrder(
            makerAsset,
            takerAsset,
            makerQuantity,
            takerQuantity
        );

        require(
            Fund(address(this)).isInAssetList(takerAsset) ||
            Fund(address(this)).getOwnedAssetsLength() < Fund(address(this)).MAX_FUND_ASSETS()
        );

        Fund(address(this)).addAssetToOwnedAssets(takerAsset);
        Fund(address(this)).orderUpdateHook(
            targetExchange,
            bytes32(identifier),
            Fund.UpdateType.make,
            [address(makerAsset), address(takerAsset)],
            [makerQuantity, takerQuantity, uint(0)]
        );
        Fund(address(this)).addOpenMakeOrder(targetExchange, makerAsset, orderId);
    }

    /// @dev Dummy function; not implemented on exchange
    function takeOrder(
        address targetExchange,
        address[6] orderAddresses,
        uint[8] orderValues,
        bytes32 identifier,
        bytes makerAssetData,
        bytes takerAssetData,
        bytes signature
    ) {
        revert();
    }

    // responsibilities of cancelOrder are:
    // - check sender is this contract or owner, or that order expired
    // - remove order from tracking array
    // - cancel order on exchange
    /// @notice Cancels orders that were not expected to settle immediately
    /// @param targetExchange Address of the exchange
    /// @param orderAddresses [2] Order maker asset
    /// @param identifier Order ID on the exchange
    function cancelOrder(
        address targetExchange,
        address[6] orderAddresses,
        uint[8] orderValues,
        bytes32 identifier,
        bytes makerAssetData,
        bytes takerAssetData,
        bytes signature
    )
        pre_cond(Fund(address(this)).owner() == msg.sender ||
                 Fund(address(this)).isShutDown()          ||
                 Fund(address(this)).orderExpired(targetExchange, orderAddresses[2])
        )
    {
        Fund(address(this)).removeOpenMakeOrder(targetExchange, orderAddresses[2]);

        // Pass in 0 address as makerAsset parameter to getOrder function as it's not used
        var (makerAsset, , makerQuantity,) = getOrder(targetExchange, uint(identifier), address(0));
        require(Asset(makerAsset).transferFrom(msg.sender, address(this), makerQuantity));
        require(Asset(makerAsset).approve(targetExchange, makerQuantity));
        require(CentralizedExchangeBridge(targetExchange).cancelOrder(uint(identifier)));
        Fund(address(this)).orderUpdateHook(
            targetExchange,
            bytes32(identifier),
            Fund.UpdateType.cancel,
            [address(0), address(0)],
            [uint(0), uint(0), uint(0)]
        );
    }

    // VIEW FUNCTIONS

    function getOrder(
        address targetExchange,
        uint id,
        address makerAsset
    )
        view
        returns (
            address makerAssetAddress, address takerAssetAddress,
            uint makerQuantity, uint takerQuantity
        )
    {
        (
            makerQuantity,
            makerAssetAddress,
            takerQuantity,
            takerAssetAddress
        ) = CentralizedExchangeBridge(targetExchange).getOrder(id);
    }
}
