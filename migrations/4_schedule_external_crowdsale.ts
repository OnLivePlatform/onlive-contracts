import { OnLiveArtifacts } from 'onlive';
import { Deployer } from 'truffle';
import * as Web3 from 'web3';

import { daysToBlocks, Web3Utils } from '../utils';

declare const artifacts: OnLiveArtifacts;
declare const web3: Web3;

const utils = new Web3Utils(web3);

const ExternalCrowdsale = artifacts.require('./ExternalCrowdsale.sol');

async function deploy() {
  const duration = daysToBlocks(11);
  const startOffset = 0; // TODO: consider setting the offset

  const currentBlock = await utils.getBlockNumber();
  const startBlock = currentBlock + startOffset;
  const endBlock = startBlock + duration;

  const crowdsale = await ExternalCrowdsale.deployed();
  await crowdsale.scheduleSale(startBlock, endBlock);
}

function migrate(deployer: Deployer) {
  deployer.then(() => deploy());
}

export = migrate;
