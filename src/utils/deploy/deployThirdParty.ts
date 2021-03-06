import { Environment } from '../environment/Environment';
import { getContract } from '~/utils/solidity/getContract';
import { TokenInterface, createToken } from '@melonproject/token-math/token';
import {
  deployToken,
  deployWeth,
} from '~/contracts/dependencies/token/transactions/deploy';
import { getToken } from '~/contracts/dependencies/token/calls/getToken';
import { deployMatchingMarket } from '~/contracts/exchanges/transactions/deployMatchingMarket';
import {
  deployKyberEnvironment,
  KyberEnvironment,
} from '~/contracts/exchanges/transactions/deployKyberEnvironment';
import { deploy0xExchange } from '~/contracts/exchanges/transactions/deploy0xExchange';
import { ensure } from '../guards/ensure';
import { Address } from '@melonproject/token-math/address';
import { Contracts } from '~/Contracts';
import { BigInteger, power } from '@melonproject/token-math/bigInteger';

export interface ThirdPartyContracts {
  exchanges: {
    kyber: KyberEnvironment;
    matchingMarket: Address;
    zeroEx: Address;
    ethfinex: Address;
  };
  tokens: TokenInterface[];
}

const deployThirdParty = async (
  environment: Environment,
  tokens: TokenInterface[] = [
    createToken('WETH'),
    createToken('MLN'),
    createToken('EUR'),
    createToken('DGX', undefined, 9),
    createToken('ZRX'),
  ],
): Promise<ThirdPartyContracts> => {
  ensure(!!tokens.find(t => t.symbol === 'WETH'), 'WETH Token is required');
  ensure(!!tokens.find(t => t.symbol === 'MLN'), 'MLN Token is required');
  ensure(!!tokens.find(t => t.symbol === 'EUR'), 'EUR Token is required');
  ensure(!!tokens.find(t => t.symbol === 'DGX'), 'DGX Token is required');
  ensure(!!tokens.find(t => t.symbol === 'ZRX'), 'ZRX Token is required');

  // : Promise<thirdPartyContracts>
  const deployedTokens: TokenInterface[] = await tokens.reduce(
    async (carryP, current) => {
      const carry = await carryP;
      let deployed;
      if (current.symbol === 'WETH') {
        deployed = await getToken(environment, await deployWeth(environment));
      } else {
        deployed = await getToken(
          environment,
          await deployToken(environment, current.symbol, current.decimals),
        );
      }
      return [...carry, deployed];
    },
    Promise.resolve([]),
  );

  // Deposit WETH
  const depositAmount = power(new BigInteger(10), new BigInteger(24));
  await getContract(
    environment,
    Contracts.Weth,
    deployedTokens.find(t => t.symbol === 'WETH').address,
  )
    .methods.deposit()
    .send({
      from: environment.wallet.address,
      value: `${depositAmount}`,
    });

  const zrxToken = deployedTokens.find(t => t.symbol === 'ZRX');

  const matchingMarket = await deployMatchingMarket(environment, {
    tokens: deployedTokens,
  });
  const kyber = await deployKyberEnvironment(environment, [
    deployedTokens.find(t => t.symbol === 'MLN'),
    deployedTokens.find(t => t.symbol === 'EUR'),
  ]);
  const zeroEx = await deploy0xExchange(environment, { zrxToken });
  const ethfinex = await deploy0xExchange(environment, { zrxToken });

  return {
    exchanges: {
      ethfinex,
      kyber,
      matchingMarket,
      zeroEx,
    },
    tokens: deployedTokens,
  };
};

export { deployThirdParty };
