import { Exchanges } from '~/Contracts';
import { deployToken } from '~/contracts/dependencies/token/transactions/deploy';
import { getToken } from '~/contracts/dependencies/token/calls/getToken';
import { addTokenPairWhitelist } from '~/contracts/exchanges/transactions/addTokenPairWhitelist';
import { deploy as deployPriceFeed } from '~/contracts/prices/transactions/deploy';
import { deployMatchingMarket } from '~/contracts/exchanges/transactions/deployMatchingMarket';
import { deployMatchingMarketAdapter } from '~/contracts/exchanges/transactions/deployMatchingMarketAdapter';
import { deploy as deployEngine } from '~/contracts/engine/transactions/deploy';
import { setRegistry } from '~/contracts/engine/transactions/setRegistry';
import { deploy as deployPriceTolerance } from '~/contracts/fund/policies/risk-management/transactions/deploy';
import { deployRegistry } from '~/contracts/version/transactions/deployRegistry';
import { registerAsset } from '~/contracts/version/transactions/registerAsset';
import { registerExchange } from '~/contracts/version/transactions/registerExchange';
import { registerVersion } from '~/contracts/version/transactions/registerVersion';
import { deployVersion } from '~/contracts/version/transactions/deployVersion';
import { setEngine } from '~/contracts/version/transactions/setEngine';
import { setMlnToken } from '~/contracts/version/transactions/setMlnToken';
import { setPriceSource } from '~/contracts/version/transactions/setPriceSource';
import { deployFundRanking } from '~/contracts/factory/transactions/deployFundRanking';
import { deployWhitelist } from '~/contracts/fund/policies/compliance/transactions/deployWhitelist';
import { deployAccountingFactory } from '~/contracts/fund/accounting/transactions/deployAccountingFactory';
import { deployFeeManagerFactory } from '~/contracts/fund/fees/transactions/deployFeeManagerFactory';
import { deployParticipationFactory } from '~/contracts/fund/participation/transactions/deployParticipationFactory';
import { deploySharesFactory } from '~/contracts/fund/shares/transactions/deploySharesFactory';
import { deployTradingFactory } from '~/contracts/fund/trading/transactions/deployTradingFactory';
import { deployVaultFactory } from '~/contracts/fund/vault/transactions/deployVaultFactory';
import { deployPolicyManagerFactory } from '~/contracts/fund/policies/transactions/deployPolicyManagerFactory';
import { deployKyberEnvironment } from '~/contracts/exchanges/transactions/deployKyberEnvironment';
import { deploy0xAdapter } from '~/contracts/exchanges/transactions/deploy0xAdapter';
import { deploy0xExchange } from '~/contracts/exchanges/transactions/deploy0xExchange';
import { LogLevels, Environment } from './environment/Environment';
// tslint:enable:max-line-length

/**
 * Deploys all contracts and checks their health
 */
export const deploySystem = async (environment: Environment) => {
  const debug = environment.logger('melon:protocol:utils', LogLevels.DEBUG);
  const accounts = await environment.eth.getAccounts();

  debug('Deploying system from', accounts[0]);
  const mlnTokenAddress = await deployToken(environment, 'MLN');
  const quoteToken = await getToken(
    environment,
    await deployToken(environment, 'WETH'),
  );
  const baseToken = await getToken(environment, mlnTokenAddress);
  const wethToken = quoteToken;
  const mlnToken = baseToken;
  const eurToken = await getToken(
    environment,
    await deployToken(environment, 'EUR'),
  );
  const zrxToken = await getToken(
    environment,
    await deployToken(environment, 'ZRX'),
  );
  const assets = [wethToken, mlnToken, eurToken, zrxToken];
  const priceFeedAddress = await deployPriceFeed(environment, quoteToken);
  const matchingMarketAddress = await deployMatchingMarket(environment);
  const {
    kyberNetworkProxyAddress,
    kyberAdapterAddress,
  } = await deployKyberEnvironment(
    environment,
    accounts[0],
    quoteToken,
    baseToken,
    eurToken,
  );

  const zeroExAddress = await deploy0xExchange(environment, { zrxToken });
  const zeroExAdapterAddress = await deploy0xAdapter(environment);

  await addTokenPairWhitelist(environment, matchingMarketAddress, {
    baseToken,
    quoteToken,
  });

  const priceToleranceAddress = await deployPriceTolerance(environment, 10);
  const whitelistAddress = await deployWhitelist(environment, [accounts[0]]);
  const matchingMarketAdapterAddress = await deployMatchingMarketAdapter(
    environment,
  );
  const accountingFactoryAddress = await deployAccountingFactory(environment);
  const feeManagerFactoryAddress = await deployFeeManagerFactory(environment);
  const participationFactoryAddress = await deployParticipationFactory(
    environment,
  );
  const sharesFactoryAddress = await deploySharesFactory(environment);
  const tradingFactoryAddress = await deployTradingFactory(environment);
  const vaultFactoryAddress = await deployVaultFactory(environment);
  const policyManagerFactoryAddress = await deployPolicyManagerFactory(
    environment,
  );
  const monthInSeconds = 30 * 24 * 60 * 60;
  // Not used since deployer is assumed to be governance
  // const governanceAddress = accounts[0];
  const engineAddress = await deployEngine(environment, monthInSeconds);
  const registryAddress = await deployRegistry(environment);
  await setMlnToken(environment, registryAddress, { address: mlnTokenAddress });
  await setPriceSource(environment, registryAddress, {
    address: priceFeedAddress,
  });
  await setEngine(environment, registryAddress, { address: engineAddress });

  const versionAddress = await deployVersion(environment, {
    accountingFactoryAddress,
    engineAddress,
    factoryPriceSourceAddress: priceFeedAddress,
    feeManagerFactoryAddress,
    mlnTokenAddress,
    participationFactoryAddress,
    policyManagerFactoryAddress,
    registryAddress,
    sharesFactoryAddress,
    tradingFactoryAddress,
    vaultFactoryAddress,
  });
  await registerVersion(environment, registryAddress, {
    address: versionAddress,
    name: '0.0.0',
  });
  await setRegistry(environment, engineAddress, { address: registryAddress });
  const rankingAddress = await deployFundRanking(environment);
  const exchangeConfigs = [
    {
      adapterAddress: matchingMarketAdapterAddress,
      exchangeAddress: matchingMarketAddress,
      name: Exchanges.MatchingMarket,
      takesCustody: false,
    },
    {
      adapterAddress: kyberAdapterAddress,
      exchangeAddress: kyberNetworkProxyAddress,
      name: Exchanges.KyberNetwork,
      takesCustody: false,
    },
    {
      adapterAddress: zeroExAdapterAddress,
      exchangeAddress: zeroExAddress,
      name: Exchanges.ZeroEx,
      takesCustody: false,
    },
  ];

  for (const exchangeConfig of exchangeConfigs) {
    await registerExchange(environment, registryAddress, {
      adapter: exchangeConfig.adapterAddress,
      exchange: exchangeConfig.exchangeAddress,
      sigs: [],
      takesCustody: exchangeConfig.takesCustody,
    });
  }

  for (const asset of assets) {
    await registerAsset(environment, registryAddress, {
      assetAddress: `${asset.address}`,
      assetSymbol: asset.symbol,
      decimals: asset.decimals,
      name: '',
      sigs: [],
      standards: [],
      url: '',
    });
  }

  const priceSource = priceFeedAddress;

  const addresses = {
    engine: engineAddress,
    exchangeConfigs,
    policies: {
      priceTolerance: priceToleranceAddress,
      whitelist: whitelistAddress,
    },
    priceSource,
    ranking: rankingAddress,
    registry: registryAddress,
    tokens: [quoteToken, baseToken, eurToken, zrxToken],
    version: versionAddress,
  };

  const track = environment.track;
  const network = await environment.eth.net.getId();
  const deploymentId = `${network}:${track}`;

  debug('Deployed:', deploymentId, addresses);

  return {
    ...environment,
    deployment: addresses,
  };
};
