import { BigInteger } from '@melonproject/token-math/bigInteger';

// TODO: JSDoc comments here
// instances is object containing contract instances of mln and weth
// accounts is an array of addresses
// fund is a fund address TODO: (maybe can make this part of accounts array)
// TODO: consider making this more general,
// rather than assuming certain account numbers are manager, investor, etc.
export async function getAllBalances(instances, accounts, fund, env) {
  const [
    deployer,
    manager,
    investor,
    worker,
    exchangeOwner,
    custodian,
  ] = accounts;

  return {
    custodian: {
      ether: new BigInteger(await env.eth.getBalance(custodian)),
      mln: new BigInteger(
        await instances.mln.methods.balanceOf(custodian).call(),
      ),
      weth: new BigInteger(
        await instances.weth.methods.balanceOf(custodian).call(),
      ),
    },
    deployer: {
      ether: new BigInteger(await env.eth.getBalance(deployer)),
      mln: new BigInteger(
        await instances.mln.methods.balanceOf(deployer).call(),
      ),
      weth: new BigInteger(
        await instances.weth.methods.balanceOf(deployer).call(),
      ),
    },
    exchangeOwner: {
      ether: new BigInteger(await env.eth.getBalance(deployer)),
      mln: new BigInteger(
        await instances.mln.methods.balanceOf(exchangeOwner).call(),
      ),
      weth: new BigInteger(
        await instances.weth.methods.balanceOf(exchangeOwner).call(),
      ),
    },
    fund: {
      ether: new BigInteger(
        await env.eth.getBalance(fund.vault.options.address),
      ),
      mln: new BigInteger(
        await fund.accounting.methods
          .assetHoldings(instances.mln.options.address)
          .call(),
      ),
      weth: new BigInteger(
        await fund.accounting.methods
          .assetHoldings(instances.weth.options.address)
          .call(),
      ),
    },
    investor: {
      ether: new BigInteger(await env.eth.getBalance(investor)),
      mln: new BigInteger(
        await instances.mln.methods.balanceOf(investor).call(),
      ),
      weth: new BigInteger(
        await instances.weth.methods.balanceOf(investor).call(),
      ),
    },
    manager: {
      ether: new BigInteger(await env.eth.getBalance(manager)),
      mln: new BigInteger(
        await instances.mln.methods.balanceOf(manager).call(),
      ),
      weth: new BigInteger(
        await instances.weth.methods.balanceOf(manager).call(),
      ),
    },
    worker: {
      ether: new BigInteger(await env.eth.getBalance(worker)),
      mln: new BigInteger(await instances.mln.methods.balanceOf(worker).call()),
      weth: new BigInteger(
        await instances.weth.methods.balanceOf(worker).call(),
      ),
    },
  };
}
