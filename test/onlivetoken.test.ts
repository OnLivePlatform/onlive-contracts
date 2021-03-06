import { assert } from 'chai';
import { propOr, without } from 'ramda';

import { ContractContextDefinition } from 'truffle';
import * as Web3 from 'web3';

import { OnLiveArtifacts, OnLiveToken } from 'onlive';
import { toONL } from '../utils';
import { assertTokenEqual } from './helpers';
import { testBurn } from './token/burnabletoken.test';
import { testMint as testCappedMint } from './token/cappedmintabletoken.test';
import { TokenTestContext } from './token/context';
import {
  testChangeDescription,
  testFinalizeDescription
} from './token/descriptivetoken.test';
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

const OnLiveTokenContract = artifacts.require('./OnLiveToken.sol');

interface TokenOptions {
  name: string;
  symbol: string;
  maxSupply: Web3.AnyNumber;
  from: Address;
}

contract('OnLiveToken', accounts => {
  const owner = accounts[9];
  const name = 'OnLive Token';
  const symbol = 'ONL';
  const maxSupply = toONL(1000);

  async function createToken(options?: Partial<TokenOptions>) {
    return await OnLiveTokenContract.new(
      propOr(name, 'name', options),
      propOr(symbol, 'symbol', options),
      propOr(maxSupply, 'maxSupply', options),
      { from: propOr(owner, 'from', options) }
    );
  }

  describe('#ctor', () => {
    it('should set name', async () => {
      const token = await createToken();
      assert.equal(await token.name(), name);
    });

    it('should set symbol', async () => {
      const token = await createToken();
      assert.equal(await token.symbol(), symbol);
    });

    it('should set maxSupply', async () => {
      const token = await createToken();
      assertTokenEqual(await token.maxSupply(), maxSupply);
    });

    it('should set owner', async () => {
      const token = await createToken();
      assert.equal(await token.owner(), owner);
    });
  });

  context('Given deployed token contract', () => {
    const ctx = new TokenTestContext<OnLiveToken>(
      without([owner], accounts),
      owner
    );

    beforeEach(async () => {
      ctx.token = await createToken();
    });

    describe('DescriptiveToken base', () => {
      describe('#changeDescription', () => testChangeDescription(ctx));
      describe('#finalizeDescription', () => testFinalizeDescription(ctx));
    });

    describe('ReleasableToken base', () => {
      describe('#setReleaseManager', () => testSetReleaseManager(ctx));
      describe('#approveTransferManager', () => testAddTransferManager(ctx));
      describe('#revokeTransferManager', () => testRemoveTransferManager(ctx));
      describe('#release', () => testRelease(ctx));
    });

    describe('MintableToken base', () => {
      describe('#mint', () => testMint(ctx));
      describe('#approveMintingManager', () => testAddMintingManager(ctx));
      describe('#revokeMintingManager', () => testRemoveMintingManager(ctx));
      describe('#finishMinting', () => testFinishMinting(ctx));
    });

    describe('CappedMintableToken base', () => {
      describe('#mint (capped)', () => testCappedMint(ctx));
    });

    context('Given account has 100 tokens', () => {
      const initialBalance = toONL(100);
      const holderAccount = ctx.accounts[5];
      const mintingManager = ctx.accounts[6];

      beforeEach(async () => {
        ctx.accounts = without([holderAccount, mintingManager], ctx.accounts);

        await ctx.token.approveMintingManager(mintingManager, {
          from: owner
        });

        await ctx.token.mint(holderAccount, initialBalance, {
          from: mintingManager
        });
      });

      describe('ReleasableToken base', () => {
        describe('#transfer', () => testTransfer(ctx, holderAccount));
        describe('#transferFrom', () => testTransferFrom(ctx, holderAccount));
      });

      describe('BurnableToken base', () => {
        describe('#burn', () => testBurn(ctx, holderAccount));
      });
    });
  });
});
