# Melon Protocol

<img src = "https://github.com/melonproject/branding/blob/master/melon/03_M_logo.jpg" width = "25%" align="right">

[![Gitter chat](https://img.shields.io/gitter/room/melonproject/protocol.js.svg?style=flat-square&colorB=46bc99)](https://gitter.im/melonproject/general 'Gitter chat')
[![Build Status](https://img.shields.io/travis/melonproject/protocol/master.svg?style=flat-square)](https://travis-ci.org/melonproject/protocol)
[![Solidity version](https://img.shields.io/badge/solidity-0.4.19-brightgreen.svg?style=flat-square&colorB=C99D66)](https://github.com/ethereum/solidity/releases/tag/v0.4.19)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg?style=flat-square)](https://www.gnu.org/licenses/gpl-3.0)
![Dependencies](https://img.shields.io/david/melonproject/melon.js.svg?style=flat-square)
![Development Dependencies](https://img.shields.io/david/dev/melonproject/melon.js.svg?style=flat-square)

Melon ([méllō], μέλλω; Greek for "destined to be") is blockchain software that seeks to enable participants to set up, manage and invest in technology regulated investment funds in a way that reduces barriers to entry, while minimizing the requirements for trust.

It does so by leveraging the fact that digital assets on distributed quasi-Turing Complete machines can be held solely by smart-contract code, and spent only according to preprogrammed rules within this code.
The Melon protocol is a set of rules for how digital assets can be spent once held in a Melon smart-contract, or a Melon investment fund.
These rules are meant to protect the investor and fund manager from malevolent behaviour of each other, even when both parties remain private.

Melon is to investment funds as Bitcoin is to accounting: a set of rules, enforced by blockchain technology, legitimized by the consent of its participants.

This repository contains a reference implementation of the Melon protocol written in Solidity, as specified in our [paper][paper-url].

## Get started

### Prerequisites

- Yarn

### Installation

```sh
# Clone this repository
git clone git@github.com:melonproject/protocol.git
cd protocol
# Install dependencies
yarn install
```

If you don't set `JSON_RPC_ENDPOINT`, the test will load ganache in-memory which works but is much slower.

### Development and testing

After installation, go to the above `protocol` directory, open a terminal and:

```sh
# Launch parity dev chain:
yarn devchain
# Generate bytecode and abi of smart-contracts
yarn compile
# Run the tests using
yarn test
```

## Deploy

To just develop and test, you don't need to deploy. Unit & integration-tests do deploy the contracts they need.

But if you want to deploy the protcol to Kovan or Mainnet, here is the recommended way:

### Deploy a fresh test version to Kovan through Infura with a keystore V3 file

- Create a `.keystore.json` file in the project root. See [What is an Ethereum Keystore file](https://medium.com/@julien.maffre/what-is-an-ethereum-keystore-file-86c8c5917b97) about keystore v3 JSON files.
- To deploy the kovan config to infura, type the following command:

```bash
yarn deploy \
  --config deployments/configs/kovan-fresh.json \
  --gas-price 2000000000 \
  --keystore .keystore.json \
  --endpoint wss://kovan.infura.io/ws/v3/YOUR-PROJECT-ID
```

This will prompt to enter the password for the keystore file. A solution on CI would be to set the `KEYSTORE_PASSWORD` env var.

### Deploy a new version (only a selection of contracts)

Deployment is flexible: basically it just deploys all contracts that are not found in the deployment config JSON. Here is a step-by-step guide how to deploy a new version with one changed factory:

- Copy the latest deployment into configs:

```sh
cp deployments/kovan-default.json deployments/configs/kovan-default/001-change-0.9.100.json
```

Naming is: `deployments/configs/[chain]-[track]/[index]-[short-name]-[version from package.json].json`

- Append the README.md in `deployments/configs/[chain]-[track]/` with your change.

- Change the addresses of the factory that you want to redeploy and of the version to **"DEPLOY"**. This will redeploy the factory, and redeploy the version with the new factory and all old factories registered. Remove `exchangeConfigs` anyways, this is just for information.

- Run deploy:

```sh
yarn deploy --config deployments/configs/kovan-default/001-change-0.9.100.json
```

### Run an unlocked node to deploy

```sh
# Launch an ethereum client. For example something similar to this:
parity \
  --chain kovan      \
  --rpcport 8545     \
  --auto-update=all  \
  --jsonrpc-apis=all \
  --author <address> \
  --unlock <address> \
  --password <password file>

# Open a second terminal and deploy the contracts:
yarn deploy \
  --config deployments/configs/kovan-fresh.json \
  --gas-price 2000000000 \
```

### Note on versioning

It is recommended to change the version in package.json before changing the code base. Here is the step-by-step guide:

1. Change the version in package.json (`yarn version`)
2. Do the code changes
3. Check if they run (`yarn test`)
4. Deploy the contracts to Kovan/Mainnet (`yarn compile && yarn deploy ...`)
5. Run the system tests (`yarn test:system`)
6. Publish the package to npm (`yarn build && yarn publish`)

... repeat

This workflow ensures, that all versions are always in sync

## Use it as a consumer

To integrate the Melon Protocol into your application, you do not need to clone this repo, you can just install it from npm:

```bash
yarn add @melonproject/protocol
```

You need to have a local dev-chain running to develop your consuming application. We recommend Ganache:

```bash
yarn add -D ganache-cli
yarn ganache-cli --gasLimit 0x7a1200 --defaultBalanceEther 1000000
```

Then, you can deploy the contracts to your local dev node:

```bash
yarn melon deploy
```

This creates a new deployment which you can use like this:

```typescript
import * as protocol from '@melonproject/protocol';

const environment = await protocol.utils.environment.initTestEnvironment();
const deployment = protocol.utils.solidity.getDeployment(environment);
const hub = await protocol.factory.managersToHubs(
  deployment.fundFactory,
  '0xdeadbeef',
  environment,
);
```

## Development Tips

### Using the logger

To help debug the system, the test environment has loggers that log into `./logs/`. This keeps the terminal clean but also a great possibility to inspect the logs in detail. Here is how it works:

Inside a function that has the environment, the `environment.logger` is a curried function with the following signature:

```ts
(namespace: string, level: LogLevels, ...messages: any): void;

```

This currying gives a high level of flexibility, but basically we just use this pattern:

```ts
const log = environment.logger('melon:protocol:module');

// and then use debug as you would console.log:

log(
  LogLevels.DEBUG,
  'Something happened',
  interestingObject,
  ' ... and more ...',
  whatever,
);
```

Basically, `LogLevels.DEBUG` just logs into the log files and does not output to the screen. `LogLevels.INFO` logs to the console for deployment but not during tests. So INFO logs should be concise whereas DEBUG logs should be verbose. `LogLevels.WARN` and `LogLevels.ERROR` log always to the console.

A consumer can obviously inject its own logger.

### Deconstruct a transaction from the transactionFactory

Generally, transactions have a shortcut method called `execute`, which is renamed to the actual transaction name:

```ts
import { transfer } from '~/contracts/dependencies/token/transactions/transfer';

const params = {
  howMuch: createQuantity(shared.token, 2000000),
  to: shared.accounts[1],
};

await transfer(params);
```

If one needs to have custom access to the different steps, like a custom signer, the transaction function can be decomposed into a prepare and sign step:

```ts
import { sign } from '~/utils/environment/sign';

const prepared = await transfer.prepare(params);

const signedTransactionData = await sign(prepared.rawTransaction, environment);

const result = await transfer.send(signedTransactionData, params);
```

### Skip gas estimation preflight/guards

Sometimes during development, one wants to check if a transaction actually fails without the guards. To do so, there are options inside of the transaction factory. The simplest example would be `transfer`. So here is the minimalistic usage of `transfer` with skipped guards and transactions:

```ts
import { transfer } from '~/contracts/dependencies/token/transactions/transfer';

const params = {
  howMuch: createQuantity(shared.token, 2000000),
  to: shared.accounts[1],
};

await transfer(params, environment, {
  gas: '8000000',
  skipGasEstimation: true,
  skipGuards: true,
});
```

The same pattern could be applied to the deconstructed execute:

```ts
import { sign } from '~/utils/environment/sign';

const options = {
  gas: '8000000',
  skipGasEstimation: true,
  skipGuards: true,
};

const prepared = await transfer.prepare(params, options);

const signedTransactionData = await sign(prepared.rawTransaction, environment);

const result = await transfer.send(signedTransactionData, params);
```

### Events

**Main principle**: Every smart contract should be seen as an [event-sourced](https://martinfowler.com/eaaDev/EventSourcing.html) entity:

- It has one current state. We can query the current state through calls.
- This current state is the result of an initial state and a list of transactions that altered that state. When the state of a smart contract changes, it should emit events in a fashion that **an external observer can reproduce the state of the smart contract from every point in history only by observing the emitted events**.

In other words: Events should transport as much information as needed so that an observer can sync for example a database.

#### How to do this:

1. Define the shape of the state of a smart contract
2. Define possible changes to that state
3. Emit events when that state changes.

#### Example ERC20

1. Shape of state:

```solidity
mapping (address => uint256) balances;
```

2. Possible changes:

- Someone sends somebody an amount: Transfer

3. Emit events:
   It is obvious for that example, but lets see what an observer can see the following events and reproduce every step in history.

For the sake of simplicity, lets assume that:
`0x0`: is the null address
`0x1`: user 1
`0x2`: user 2
...and so on

```
Transfer(0x0, 0x1, 100) // Initial minting: User 1 receives 100 tokens. Total 100 tokens.
Transfer(0x1, 0x2, 30) // User 1 sends 30 tokens to user 2. New balances: User 1: 70, User 2: 30.
...
```

Although we fire events _after_ the action happened, we use nouns in the event names. So: NewFund instead of FundCreated of CreateFund.

Like we communicate to the outside world: Hey, there is a NewFund.

## Troubleshooting

### Permission denied (publickey) when cloning the repo

Try cloning using `git clone https://github.com/melonproject/smart-contracts.git`

### Spec json is invalid when running Parity Devchain

Update your Parity installation to the latest version or try changing `"instantSeal": null` to `"instantSeal": { "params": {} }` in chainGenesis.json

### Stuck at deploy step

Deploying contracts may stuck indefinitely in case your parity node is not unlocked for some reason. Locked node requires you to enter password for each transaciton manually.

## Contributing

As an open-source project, we welcome any kind of community involvement, whether that is by contributing code, reporting issues or engaging in insightful discussions.
Please see [our contributing instructions](CONTRIBUTING.md) for information on the code style we use.

### Security Issues

If you find a vulnerability that may affect live or testnet deployments please send your report privately to [security@melonport.com](http://keyserver2.pgp.com/vkd/SubmitSearch.event?SearchCriteria=security%40melonport.com). Please **DO NOT** file a public issue.

### Protocol Design

When considering protocol design proposals, we are looking for:

- A description of the problem this design proposal solves
- Discussion of the tradeoffs involved
- Review of other existing solutions
- Links to relevant literature (RFCs, papers, etc)
- Discussion of the proposed solution

Please note that protocol design is hard, and meticulous work. You may need to review existing literature and think through generalized use cases.

### Implementation Design

When considering design proposals for implementations, we are looking for:

- A description of the problem this design proposal solves
- Discussion of the tradeoffs involved
- Discussion of the proposed solution

[paper-url]: https://github.com/melonproject/paper/blob/specs/specs.pdf
[dependencies-badge-url]: https://david-dm.org/melonproject/melon.js
