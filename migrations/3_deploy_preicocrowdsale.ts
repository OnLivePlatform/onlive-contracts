import { OnLiveArtifacts } from 'onlive';
import { Deployer } from 'truffle';

declare const artifacts: OnLiveArtifacts;

const OnLiveToken = artifacts.require('./OnLiveToken.sol');
const PreIcoCrowdsale = artifacts.require('./PreIcoCrowdsale.sol');

async function deploy(deployer: Deployer) {
  const token = await OnLiveToken.deployed();

  // TODO: fill constructor parameters
  await deployer.deploy(PreIcoCrowdsale);

  const crowdsale = await PreIcoCrowdsale.deployed();
  await token.approveMintingManager(crowdsale.address);
}

function migrate(deployer: Deployer) {
  // TODO: restore migration
  // deployer.then(() => deploy(deployer));
}

export = migrate;
