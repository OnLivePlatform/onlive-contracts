import { OnLiveArtifacts } from 'onlive';
import { Deployer } from 'truffle';
import * as Web3 from 'web3';

import { BlockCalculator, blockTimes, Web3Utils } from '../utils';

declare const artifacts: OnLiveArtifacts;
declare const web3: Web3;

const utils = new Web3Utils(web3);

const PreIcoCrowdsale = artifacts.require('./PreIcoCrowdsale.sol');

async function deploy(network: string) {
  const calculator = new BlockCalculator(blockTimes[network]);

  const duration = calculator.daysToBlocks(31) + calculator.hoursToBlocks(12);
  const startOffset = calculator.hoursToBlocks(10);

  const currentBlock = await utils.getBlockNumber();
  const startBlock = currentBlock + startOffset;
  const endBlock = startBlock + duration;

  const crowdsale = await PreIcoCrowdsale.deployed();
  await crowdsale.schedule(startBlock, endBlock);
}

function migrate(deployer: Deployer, network: string) {
  deployer.then(() => deploy(network));
}

export = migrate;
