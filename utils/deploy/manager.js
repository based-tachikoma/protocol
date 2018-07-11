import deployTokens from "./scripts/tokens";
// import deployCompliance from "./scripts/compliance";
// import deployTokens from "./scripts/tokens";
// import deployTokens from "./scripts/tokens";
// import deployTokens from "./scripts/tokens";


async function deployEnvironment(environment) {
  switch (environment) {
    case 'development':
      await deployTokens(environment);
      break;
    case 'kovan-demo':
      break;
    case 'kovan-competition':
      break;
    case 'live-competition':
      break;
    default:
      throw new Error(`Environment ${environment} not defined.`);
  }
}

if (require.main === module) {
  const environment = process.env.CHAIN_ENV;
  deployEnvironment(environment)
    // .then(deployedContracts => writeToAddressBook(deployedContracts, environment))
    .catch(err => console.error(err.stack))
    .finally(() => process.exit())
}

export default deployEnvironment;
