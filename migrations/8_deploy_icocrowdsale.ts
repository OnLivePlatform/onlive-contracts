import * as Web3 from 'web3';

import { OnLiveArtifacts } from 'onlive';
import { Deployer } from 'truffle';
import { toMillionsONL, toWei } from '../utils';

declare const artifacts: OnLiveArtifacts;
declare const web3: Web3;

const OnLiveToken = artifacts.require('./OnLiveToken.sol');
const IcoCrowdsale = artifacts.require('./IcoCrowdsale.sol');

async function deploy(deployer: Deployer, network: string) {
  const token = await OnLiveToken.deployed();
  const minValue = toWei('0.1');

  let wallet = web3.eth.accounts[0];
  if (network === 'mainnet') {
    wallet = '0xd0078f5c7E33BaD8767c602D3aaEe6e38481c9A1';
  }

  await deployer.deploy(IcoCrowdsale, wallet, token.address, minValue);

  const crowdsale = await IcoCrowdsale.deployed();
  await token.approveMintingManager(crowdsale.address);
  await token.approveTransferManager(crowdsale.address);
}

function migrate(deployer: Deployer, network: string) {
  deployer.then(() => deploy(deployer, network));
}

export = migrate;
