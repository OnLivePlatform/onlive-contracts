import { OnLiveArtifacts } from 'onlive';
import { Deployer } from 'truffle';
import * as Web3 from 'web3';

import { toMillionsONL, toWei } from '../utils';

declare const artifacts: OnLiveArtifacts;
declare const web3: Web3;

const IcoCrowdsale = artifacts.require('./IcoCrowdsale.sol');

async function deploy() {
  const availableAmount = toMillionsONL('61.050');
  const stages = [
    {
      price: toWei(0.00131),
      start: getUnixSeconds(new Date(2018, 2, 11)) // month starts from 0
    },
    {
      price: toWei(0.001458),
      start: getUnixSeconds(new Date(2018, 2, 22))
    },
    {
      price: toWei(0.001638),
      start: getUnixSeconds(new Date(2018, 3, 3))
    }
  ];
  const end = getUnixSeconds(new Date(2018, 3, 11));

  const crowdsale = await IcoCrowdsale.deployed();

  await stages.forEach(async stage => {
    await crowdsale.scheduleStage(stage.start, stage.price);
  });

  await crowdsale.scheduleCrowdsaleEnd(availableAmount, end);
}

function migrate(deployer: Deployer) {
  deployer.then(() => deploy());
}

export = migrate;

function getUnixSeconds(date: Date) {
  return Math.round(date.getTime() / 1000);
}
