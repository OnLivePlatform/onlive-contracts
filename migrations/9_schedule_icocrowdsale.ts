// tslint:disable:no-console

import { OnLiveArtifacts } from 'onlive';
import { Deployer } from 'truffle';
import * as Web3 from 'web3';

import {
  BlockCalculator,
  blockTimes,
  ONL_DECIMALS,
  shiftNumber,
  toMillionsONL,
  toWei,
  Web3Utils
} from '../utils';

declare const artifacts: OnLiveArtifacts;
declare const web3: Web3;

const utils = new Web3Utils(web3);

const IcoCrowdsale = artifacts.require('./IcoCrowdsale.sol');

async function deploy(network: string) {
  const crowdsale = await IcoCrowdsale.deployed();
  const calculator = new BlockCalculator(blockTimes[network]);
  const tierDuration = calculator.daysToBlocks(11);
  const startOffset = calculator.hoursToBlocks(10);
  const currentBlock = await utils.getBlockNumber();

  const availableAmount = toMillionsONL('61.050');

  const crowdsaleStartBlock = currentBlock + startOffset;
  const tiers = [
    {
      price: toWei(0.00131),
      startBlock: crowdsaleStartBlock
    },
    {
      price: toWei(0.001458),
      startBlock: crowdsaleStartBlock + tierDuration
    },
    {
      price: toWei(0.001638),
      startBlock: crowdsaleStartBlock + 2 * tierDuration
    }
  ];
  const crowdsaleEndBlock = crowdsaleStartBlock + 3 * tierDuration;

  for (const { price, startBlock } of tiers) {
    console.log(
      `Scheduling tier from ${startBlock.toLocaleString()} block`,
      `${shiftNumber(price, -ONL_DECIMALS)} ETH per token`
    );

    await crowdsale.scheduleTier(startBlock, price);
  }

  console.log(`Finalizing with ${crowdsaleEndBlock.toLocaleString()} block`);

  await crowdsale.finalize(crowdsaleEndBlock, availableAmount);
}

function migrate(deployer: Deployer, network: string) {
  deployer.then(() => deploy(network));
}

export = migrate;
