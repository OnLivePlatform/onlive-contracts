import { OnLiveArtifacts } from 'onlive';
import { Deployer } from 'truffle';
import { toMillionsONL } from '../utils';

declare const artifacts: OnLiveArtifacts;

const OnLiveToken = artifacts.require('./OnLiveToken.sol');

async function deploy(deployer: Deployer) {
  const name = 'OnLive Token';
  const symbol = 'ONL';
  const maxSupply = toMillionsONL(111);

  await deployer.deploy(OnLiveToken, name, symbol, maxSupply);
}

function migrate(deployer: Deployer) {
  deployer.then(() => deploy(deployer));
}

export = migrate;
