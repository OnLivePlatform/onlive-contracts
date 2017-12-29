import { OnLiveArtifacts } from 'onlive';
import { Deployer } from 'truffle';
import { toMillionsONL } from '../utils';

declare const artifacts: OnLiveArtifacts;

const OnLiveToken = artifacts.require('./OnLiveToken.sol');
const ExternalCrowdsale = artifacts.require('./ExternalCrowdsale.sol');

async function deploy(deployer: Deployer) {
  const token = await OnLiveToken.deployed();
  const tokensAvailable = toMillionsONL(5);
  await deployer.deploy(ExternalCrowdsale, token.address, tokensAvailable);

  const crowdsale = await ExternalCrowdsale.deployed();
  await token.approveMintingManager(crowdsale.address);
}

function migrate(deployer: Deployer) {
  deployer.then(() => deploy(deployer));
}

export = migrate;
