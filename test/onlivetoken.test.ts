import { without } from 'ramda';

import * as Web3 from 'web3';

import { OnLiveArtifacts, OnLiveToken } from 'onlive';

import { ContractContextDefinition } from 'truffle';
import { Web3Utils } from '../utils';
import { testBurn } from './token/burnabletoken.test';
import { TokenTestContext } from './token/context';
import {
  testAddMintingManager,
  testFinishMinting,
  testMint,
  testRemoveMintingManager
} from './token/mintabletoken.test';
import {
  testAddTransferManager,
  testRelease,
  testRemoveTransferManager,
  testSetReleaseManager,
  testTransfer,
  testTransferFrom
} from './token/releasabletoken.test';

declare const web3: Web3;
declare const artifacts: OnLiveArtifacts;
declare const contract: ContractContextDefinition;

const OnLiveTokenContract = artifacts.require('./token/OnLiveToken.sol');

const utils = new Web3Utils(web3);

contract('OnLiveToken', accounts => {
  const owner = accounts[9];

  const ctx = new TokenTestContext<OnLiveToken>(
    without([owner], accounts),
    owner
  );

  beforeEach(async () => {
    ctx.token = await OnLiveTokenContract.new({ from: ctx.owner });
  });

  describe('#setReleaseManager', () => testSetReleaseManager(ctx));
  describe('#addTransferManager', () => testAddTransferManager(ctx));
  describe('#removeTransferManager', () => testRemoveTransferManager(ctx));
  describe('#release', () => testRelease(ctx));

  describe('#mint', () => testMint(ctx));
  describe('#addMintingManager', () => testAddMintingManager(ctx));
  describe('#removeMintingManager', () => testRemoveMintingManager(ctx));
  describe('#finishMinting', () => testFinishMinting(ctx));

  context('Given account has 100 tokens', () => {
    const initialBalance = utils.toEther(100);
    const holderAccount = ctx.accounts[5];
    const mintingManager = ctx.accounts[6];

    beforeEach(async () => {
      ctx.accounts = without([holderAccount, mintingManager], ctx.accounts);

      await ctx.token.addMintingManager(mintingManager, {
        from: ctx.owner
      });

      await ctx.token.mint(holderAccount, initialBalance, {
        from: mintingManager
      });
    });

    describe('#transfer', () => testTransfer(ctx, holderAccount));
    describe('#transferFrom', () => testTransferFrom(ctx, holderAccount));

    describe('#burn', () => testBurn(ctx, holderAccount));
  });
});
