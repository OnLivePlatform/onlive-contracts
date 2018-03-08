import { OnLiveArtifacts } from 'onlive';
import { Deployer } from 'truffle';
import * as Web3 from 'web3';

import { BlockCalculator, blockTimes, toMillionsONL, toWei } from '../utils';

declare const artifacts: OnLiveArtifacts;
declare const web3: Web3;

const IcoCrowdsale = artifacts.require('./IcoCrowdsale.sol');

async function deploy(network: string) {
  const calculator = new BlockCalculator(blockTimes[network]);
  const tierDuration = calculator.daysToBlocks(11);
  const startOffset = calculator.hoursToBlocks(10);

  const availableAmount = toMillionsONL('61.050');
  const tiers = [
    {
      price: toWei(0.00131),
      startBlock: startOffset
    },
    {
      price: toWei(0.001458),
      startBlock: startOffset + tierDuration
    },
    {
      price: toWei(0.001638),
      startBlock: startOffset + 2 * tierDuration
    }
  ];

  const endBlock = startOffset + 3 * tierDuration;

  const crowdsale = await IcoCrowdsale.deployed();

  await tiers.forEach(async tier => {
    await crowdsale.scheduleTier(tier.startBlock, tier.price);
  });

  await crowdsale.finalize(availableAmount, endBlock);
}

function migrate(deployer: Deployer, network: string) {
  deployer.then(() => deploy(network));
}

export = migrate;
