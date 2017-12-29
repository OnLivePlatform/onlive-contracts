// tslint:disable:no-console

import * as commander from 'commander';
import { OnLiveArtifacts } from 'onlive';
import { ScriptFinalizer } from 'truffle';
import * as Web3 from 'web3';

import { Address, Bytes32, toONL, Web3Utils } from '../utils';

declare const web3: Web3;
declare const artifacts: OnLiveArtifacts;

const utils = new Web3Utils(web3);

const ExternalCrowdsale = artifacts.require(
  './contracts/ExternalCrowdsale.sol'
);

interface Options {
  paymentId: string;
  purchaser: Address;
  amount: number;
}

const argv = (commander
  .option('-i, --payment-id <paymentId>', 'unique payment id')
  .option('-p, --purchaser <purchaser>', 'recipient of the tokens')
  .option('-a, --amount <amount>', 'amount of tokens', parseFloat)
  .parse(process.argv)
  .opts() as any) as Options;

async function asyncExec() {
  const crowdsale = await ExternalCrowdsale.deployed();
  const isActive = await crowdsale.isActive();
  const owner = await crowdsale.owner();

  if (!Bytes32.test(argv.paymentId)) {
    throw new Error(`Invalid payment id: ${argv.paymentId}`);
  }

  if (!Address.test(argv.purchaser)) {
    throw new Error(`Invalid purchaser address: ${argv.purchaser}`);
  }

  if (isNaN(argv.amount)) {
    throw new Error('Invalid amount');
  }

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

  console.log(
    `Registering purchase of ${argv.amount} ONL`,
    `with ID ${argv.paymentId} to ${argv.purchaser}`
  );

  const tx = await crowdsale.registerPurchase(
    argv.paymentId,
    argv.purchaser,
    toONL(argv.amount),
    { from: owner }
  );

  console.log(`Transaction Hash: ${tx.receipt.transactionHash}`);
}

function exec(finalize: ScriptFinalizer) {
  asyncExec().then(() => finalize(), reason => finalize(reason));
}

export = exec;
