import { OnLiveArtifacts } from 'onlive';
import { Deployer } from 'truffle';

declare const artifacts: OnLiveArtifacts;

const OnLiveToken = artifacts.require('./OnLiveToken.sol');

async function deploy() {
  const token = await OnLiveToken.deployed();
  await token.changeDescription('On.Live', 'ONL');
}

function migrate(deployer: Deployer) {
  deployer.then(() => deploy());
}

export = migrate;
