import { OnLiveArtifacts } from 'onlive';
import { Deployer } from 'truffle';

declare const artifacts: OnLiveArtifacts;

const OnLiveToken = artifacts.require('./OnLiveToken.sol');
const TokenPool = artifacts.require('./TokenPool.sol');

async function deploy(deployer: Deployer) {
  const token = await OnLiveToken.deployed();

  await deployer.deploy(
    TokenPool,
    token.address,
  );
}

function migrate(deployer: Deployer) {
  deployer.then(() => deploy(deployer));
}

export = migrate;
