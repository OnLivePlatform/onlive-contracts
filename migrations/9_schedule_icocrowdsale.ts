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
  const blockTime = blockTimes[network];
  const calculator = new BlockCalculator(blockTime);

  console.log(`Estimating block numbers with ${blockTime} seconds per block`);

  const availableAmount = toMillionsONL('61.050');
  const crowdsaleStartBlock = await calculateStartBlock(calculator);
  const tiers = [
    {
      price: toWei('0.00131'),
      startBlock: crowdsaleStartBlock
    },
    {
      price: toWei('0.001458'),
      startBlock: crowdsaleStartBlock + calculator.daysToBlocks(10.5)
    },
    {
      price: toWei('0.001638'),
      startBlock: crowdsaleStartBlock + calculator.daysToBlocks(21.5)
    }
  ];
  const crowdsaleEndBlock = crowdsaleStartBlock + calculator.daysToBlocks(30.5);

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

async function calculateStartBlock(calculator: BlockCalculator) {
  const startOffset = calculator.hoursToBlocks(1);
  const currentBlock = await utils.getBlockNumber();
  const crowdsaleStartBlock = currentBlock + startOffset;
  return crowdsaleStartBlock;
}

export = migrate;
