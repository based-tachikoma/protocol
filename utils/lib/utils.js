import api from "./api";

const fs = require("fs");
const rp = require("request-promise");
const BigNumber = require("bignumber.js");
const addressBook = require("../../addressBook.json");
const environmentConfig = require("../config/environment.js");

const environment = "development";
const config = environmentConfig[environment];

const apiPath = "https://min-api.cryptocompare.com/data/price";
const addresses = addressBook[environment];

// TODO: should we have a separate token config for development network? much of the information is identical
const tokenInfo = require("../../utils/info/tokenInfo.js").kovan;

// retrieve deployed contracts
export const version = api.newContract(
  JSON.parse(fs.readFileSync("out/version/Version.abi")),
  addresses.Version,
);

export const datafeed = api.newContract(
  JSON.parse(fs.readFileSync("out/pricefeeds/PriceFeed.abi")),
  addresses.PriceFeed,
);

export const mlnToken = api.newContract(
  JSON.parse(fs.readFileSync("out/assets/PreminedAsset.abi")),
  addresses.MlnToken,
);

export const ethToken = api.newContract(
  JSON.parse(fs.readFileSync("out/assets/PreminedAsset.abi")),
  addresses.EthToken,
);

export const eurToken = api.newContract(
  JSON.parse(fs.readFileSync("out/assets/PreminedAsset.abi")),
  addresses.EurToken,
);

export const participation = api.newContract(
  JSON.parse(fs.readFileSync("out/compliance/NoCompliance.abi")),
  addresses.NoCompliance,
);

export const simpleMarket = api.newContract(
  JSON.parse(fs.readFileSync("out/exchange/thirdparty/SimpleMarket.abi")),
  addresses.SimpleMarket,
);

export const riskMgmt = api.newContract(
  JSON.parse(fs.readFileSync("out/riskmgmt/RMMakeOrders.abi")),
  addresses.RMMakeOrders,
);

export const accounts = api.eth.accounts();

// convenience functions

// input manager's address
export async function getSignatureParameters(managerAddress) {
  const hash = "0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad";
  // const hash = "0x255f369de4474bc1fe41e3f0a5eaf56f276c6ecad45b4115a5b033cf9a11eeb6";
  let sig = await api.eth.sign(managerAddress, hash);
  sig = sig.substr(2, sig.length);
  const r = `0x${sig.substr(0, 64)}`;
  const s = `0x${sig.substr(64, 64)}`;
  const v = parseFloat(sig.substr(128, 2)) + 27;
  return [r, s, v];
}

// retry the request if it fails (helps with bad connections)
async function requestWithRetries(options, maxRetries) {
  if(maxRetries === -1) {
    throw new Error('Request failed. Max retry limit reached.');
  } else {
    try {
      return await rp(options);
    } catch (err) {
      console.error(`Error during request:\n${err.message}`);
      return requestWithRetries(options, maxRetries - 1);
    }
  }
}

export default async function updatePriceFeed (instances) {
  const fromSymbol = 'MLN';
  const toSymbols = ['ETH', 'EUR', 'MLN'];
  const options = {
    uri: `${apiPath}?fsym=${fromSymbol}&tsyms=${toSymbols.join(',')}&sign=true`,
    json: true
  }
  const queryResult = await requestWithRetries(options, 3);
  if(queryResult.MLN !== 1) {
    throw new Error('API call returned incorrect price for MLN');
  } else if(queryResult.ETH === 0 || queryResult.EUR === 0) {
    throw new Error('API call returned a zero price');
  }
  const ethDecimals = tokenInfo.filter(token => token.symbol === 'ETH-T')[0].decimals
  const eurDecimals = tokenInfo.filter(token => token.symbol === 'EUR-T')[0].decimals
  const mlnDecimals = tokenInfo.filter(token => token.symbol === 'MLN-T')[0].decimals
  const inverseEth = new BigNumber(1).div(new BigNumber(queryResult.ETH)).toNumber().toFixed(15);
  const inverseEur = new BigNumber(1).div(new BigNumber(queryResult.EUR)).toNumber().toFixed(15);
  const inverseMln = new BigNumber(1).div(new BigNumber(queryResult.MLN)).toNumber().toFixed(15);
  const convertedEth = new BigNumber(inverseEth).div(10 ** (ethDecimals - mlnDecimals)).times(10 ** ethDecimals);
  const convertedEur = new BigNumber(inverseEur).div(10 ** (eurDecimals - mlnDecimals)).times(10 ** eurDecimals);
  const convertedMln = new BigNumber(inverseMln).div(10 ** (mlnDecimals - mlnDecimals)).times(10 ** mlnDecimals);
  await instances.PriceFeed.instance.update.postTransaction(
    { from: (await accounts)[0], gas: config.gas, gasPrice: config.gasPrice },
    [[instances.EthToken.address, instances.EurToken.address, instances.MlnToken.address],
    [convertedEth, convertedEur, convertedMln]]
  );
}
