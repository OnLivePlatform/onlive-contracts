// tslint:disable:no-console

import * as Web3 from 'web3';

import { OnLiveArtifacts } from 'onlive';
import { ScriptFinalizer } from 'truffle';

declare const artifacts: OnLiveArtifacts;
declare const web3: Web3;

const IcoCrowdsale = artifacts.require('./IcoCrowdsale.sol');
const OnLiveToken = artifacts.require('./OnLiveToken.sol');

async function asyncExec() {
  const ico = await IcoCrowdsale.deployed();
  const token = await OnLiveToken.deployed();

  const icoFinished = await ico.isFinished();
  const mintingFinished = await token.mintingFinished();

  if (!icoFinished) {
    throw new Error('ICO crowdsale not finished');
  }

  if (mintingFinished) {
    throw new Error('Minting already finished');
  }

  console.log('Burning not sold tokens');
  await ico.burnRemains({
    from: await ico.owner()
  });

  console.log('Finishing token minting');
  await token.finishMinting({
    from: await token.owner()
  });

  console.log('Token successfully finalized');
}

function exec(finalize: ScriptFinalizer) {
  asyncExec().then(() => finalize(), reason => finalize(reason));
}

export = exec;
