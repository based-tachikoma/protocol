import { TokenInterface } from '@melonproject/token-math/token';

import { Environment } from '~/utils/environment';
import { getContract } from '~/utils/solidity';
import { Contracts } from '~/Contracts';
import { getToken } from '~/contracts/dependencies/token';

export const getQuoteToken = async (
  contractAddress: string,
  environment?: Environment,
): Promise<TokenInterface> => {
  const contract = await getContract(
    Contracts.TestingPriceFeed,
    contractAddress,
    environment,
  );
  const quoteTokenAddress = await contract.methods.QUOTE_ASSET().call();
  const token = await getToken(quoteTokenAddress, environment);
  return token;
};