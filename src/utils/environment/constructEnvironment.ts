import web3Eth from 'web3-eth';
import * as R from 'ramda';
import { string } from 'yup';
import {
  Environment,
  Options,
  LogLevels,
  CurriedLogger,
  Tracks,
} from './Environment';
import { ensure } from '../guards/ensure';

export const defaultOptions: Options = {
  gasLimit: '8000000',
  gasPrice: '2000000000',
};

const checkIpc = endpoint => {
  const name = 'fs';
  const fs = typeof module !== 'undefined' && module.exports && require(name);

  try {
    fs.accessSync(endpoint, fs.constants.W_OK);
    return true;
  } catch (e) {
    // Swallow any potential error.
  }

  return false;
};

const makeWsProvider = endpoint =>
  new web3Eth.providers.WebsocketProvider(endpoint);

const makeHttpProvider = endpoint =>
  new web3Eth.providers.HttpProvider(endpoint);

const makeIpcProvider = endpoint => new web3Eth.providers.IpcProvider(endpoint);

const selectProvider = R.cond([
  [R.startsWith('ws'), makeWsProvider],
  [R.startsWith('http'), makeHttpProvider],
  [checkIpc, makeIpcProvider],
]);

const constructProvider = (endpoint, logger: CurriedLogger) => {
  const debug = logger('melon:protocol:utils:environment', LogLevels.DEBUG);
  debug('Endpoint', endpoint);

  string()
    .url(
      [
        `Invalid JSON RPC endpoint url: ${endpoint}.`,
        `Check your .env file or provide it explicitly`,
      ].join(''),
    )
    .isValid(endpoint);

  const provider = selectProvider(endpoint);
  if (!provider) {
    throw new Error(
      [
        `Can not construct provider from endpoint: ${endpoint}`,
        'HTTP, WS and IPC failed',
      ].join(''),
    );
  }

  debug('Provider constructed', endpoint);

  return provider;
};

const dummyLogger: CurriedLogger = R.curryN(
  3,
  (namespace, level, ...msgs) => {},
);

export const constructEnvironment = ({
  endpoint = undefined,
  provider = undefined,
  deployment = undefined,
  logger = dummyLogger,
  wallet = undefined,
  track = Tracks.TESTING,
  options = defaultOptions,
}): Environment => {
  ensure(
    Object.values(Tracks).includes(track),
    `Unknown track: ${track}. Possible tracks: ${Object.values(Tracks).join(
      ', ',
    )}`,
  );

  ensure(
    !!endpoint || !!provider,
    'You need to provide either an endpoint or a provider instance.',
  );

  logger(
    'melon:protocol:utils:environment',
    LogLevels.DEBUG,
    'Construct environment',
    { endpoint, provider: !!provider, deployment, wallet, track, options },
  );

  return {
    deployment,
    eth: new web3Eth(provider || constructProvider(endpoint, logger)),
    // tslint:disable-next-line:object-shorthand-properties-first
    logger,
    options,
    track,
    wallet,
  };
};
