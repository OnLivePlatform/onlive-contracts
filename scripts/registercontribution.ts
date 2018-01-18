// tslint:disable:no-console

import * as commander from 'commander';
import { OnLiveArtifacts } from 'onlive';
import { ScriptFinalizer } from 'truffle';
import * as Web3 from 'web3';

import { Address, Bytes32, toONL, Web3Utils } from '../utils';

declare const web3: Web3;
declare const artifacts: OnLiveArtifacts;

const utils = new Web3Utils(web3);

const OnLiveToken = artifacts.require('./contracts/OnLiveToken.sol');

const Crowdsale = artifacts.require('./contracts/Crowdsale.sol');

interface Options {
  id: string;
  contributor: Address;
  amount: number;
}

const argv = (commander
  .option('-i, --id <id>', 'unique contribution id')
  .option('-c, --contributor <contributor>', 'recipient of the tokens')
  .option('-a, --amount <amount>', 'amount of tokens', parseFloat)
  .parse(process.argv)
  .opts() as any) as Options;

async function asyncExec() {
  console.log(
    `Registering ${argv.amount} ONL`,
    `with contribution ID ${argv.id} to ${argv.contributor}`
  );

  await validate();

  const crowdsale = await Crowdsale.deployed();
  const owner = await crowdsale.owner();
  const tx = await crowdsale.registerContribution(
    argv.id,
    argv.contributor,
    toONL(argv.amount),
    { from: owner }
  );

  console.log(`Transaction Hash: ${tx.receipt.transactionHash}`);
}

async function validate() {
  validateInputParameters();
  await validateCrowdsaleState();
  await validateMintingAuthorization();
}

function validateInputParameters() {
  if (!Bytes32.test(argv.id)) {
    throw new Error(`Invalid contribution id: ${argv.id}`);
  }

  if (!Address.test(argv.contributor)) {
    throw new Error(`Invalid contributor address: ${argv.contributor}`);
  }

  if (isNaN(argv.amount)) {
    throw new Error('Invalid amount');
  }
}

async function validateCrowdsaleState() {
  const crowdsale = await Crowdsale.deployed();
  const isActive = await crowdsale.isActive();

  if (!isActive) {
    throw new Error(
      [
        `Crowdsale ${crowdsale.address} is not active`,
        `Current block: ${await utils.getBlockNumber()}`,
        `Start block: ${await crowdsale.startBlock()}`,
        `End block: ${await crowdsale.endBlock()}`
      ].join('\n')
    );
  }
}

async function validateMintingAuthorization() {
  const crowdsale = await Crowdsale.deployed();
  const token = await OnLiveToken.deployed();
  const isMintingManager = await token.isMintingManager(crowdsale.address);

  if (!isMintingManager) {
    throw new Error(
      [
        `Crowdsale ${crowdsale.address} is not authorized to`,
        `mint ${token.address} tokens`
      ].join(' ')
    );
  }
}

function exec(finalize: ScriptFinalizer) {
  asyncExec().then(() => finalize(), reason => finalize(reason));
}

export = exec;
