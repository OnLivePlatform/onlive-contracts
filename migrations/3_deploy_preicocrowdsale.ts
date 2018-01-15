import * as Web3 from 'web3';

import { OnLiveArtifacts } from 'onlive';
import { Deployer } from 'truffle';
import { toMillionsONL, toWei } from '../utils';

declare const artifacts: OnLiveArtifacts;
declare const web3: Web3;

const OnLiveToken = artifacts.require('./OnLiveToken.sol');
const PreIcoCrowdsale = artifacts.require('./PreIcoCrowdsale.sol');

async function deploy(deployer: Deployer, network: string) {
  const token = await OnLiveToken.deployed();
  const availableAmount = toMillionsONL('12.210');
  const price = toWei('0.0011466');
  const minValue = toWei('0.1');

  let wallet = web3.eth.accounts[0];
  if (network === 'mainnet') {
    wallet = '0x'; // TODO: update with multisig address
  }

  await deployer.deploy(
    PreIcoCrowdsale,
    wallet,
    token.address,
    availableAmount,
    price,
    minValue
  );

  const crowdsale = await PreIcoCrowdsale.deployed();
  await token.approveMintingManager(crowdsale.address);
}

function migrate(deployer: Deployer, network: string) {
  deployer.then(() => deploy(deployer, network));
}

export = migrate;
