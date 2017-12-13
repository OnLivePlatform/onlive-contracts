import { assert } from 'chai';

import * as Web3 from 'web3';

import { OnLiveArtifacts, ReleasableToken } from 'onlive';
import { ContractContextDefinition } from 'truffle';
import { assertThrowsInvalidOpcode } from '../helpers';
import { TokenTestContext } from './context';

declare const web3: Web3;
declare const artifacts: OnLiveArtifacts;
declare const contract: ContractContextDefinition;

const ReleasableTokenContract = artifacts.require(
  './token/ReleasableToken.sol'
);

contract('ReleasableToken', accounts => {
  const ctx = new TokenTestContext<ReleasableToken>(accounts, accounts[9]);

  beforeEach(async () => {
    ctx.token = await ReleasableTokenContract.new({ from: ctx.owner });
  });

  describe('#setReleaseManager', () => testSetReleaseManager(ctx));
  describe('#addTransferManager', () => testAddTransferManager(ctx));
  describe('#removeTransferManager', () => testRemoveTransferManager(ctx));
  describe('#release', () => testRelease(ctx));
});

export function testSetReleaseManager(ctx: TokenTestContext<ReleasableToken>) {
  const releaseManager = ctx.accounts[5];
  const otherAccount = ctx.accounts[6];

  it('should set release manager', async () => {
    assert.notEqual(await ctx.token.releaseManager(), releaseManager);
    await ctx.token.setReleaseManager(releaseManager, { from: ctx.owner });
    assert.equal(await ctx.token.releaseManager(), releaseManager);
  });

  it('should throw when called by non-owner', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.setReleaseManager(releaseManager);
    });
  });

  it('should throw when called after release', async () => {
    await ctx.token.setReleaseManager(releaseManager, { from: ctx.owner });
    await ctx.token.release({ from: releaseManager });

    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.setReleaseManager(otherAccount, { from: ctx.owner });
    });
  });
}

export function testAddTransferManager(ctx: TokenTestContext<ReleasableToken>) {
  const releaseManager = ctx.accounts[5];
  const transferManager = ctx.accounts[6];
  const otherAccount = ctx.accounts[7];

  beforeEach(async () => {
    await ctx.token.setReleaseManager(releaseManager, { from: ctx.owner });
  });

  it('should add transfer manager', async () => {
    assert.isFalse(await ctx.token.transferManagers(transferManager));
    await ctx.token.addTransferManager(transferManager, { from: ctx.owner });
    assert.isTrue(await ctx.token.transferManagers(transferManager));
  });

  it('should add multiple transfer managers', async () => {
    const managers = ctx.accounts.slice(2, 5);
    await Promise.all(
      managers.map(account =>
        ctx.token.addTransferManager(account, { from: ctx.owner })
      )
    );

    for (const account of managers) {
      assert.isTrue(await ctx.token.transferManagers(account));
    }
  });

  it('should throw when called by non-owner', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.addTransferManager(transferManager);
    });
  });

  it('should throw when called after release', async () => {
    await ctx.token.release({ from: releaseManager });
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.addTransferManager(otherAccount, { from: ctx.owner });
    });
  });
}

export function testRemoveTransferManager(
  ctx: TokenTestContext<ReleasableToken>
) {
  const releaseManager = ctx.accounts[5];
  const transferManager = ctx.accounts[6];
  const otherAccount = ctx.accounts[7];

  beforeEach(async () => {
    await ctx.token.setReleaseManager(releaseManager, { from: ctx.owner });
    await ctx.token.addTransferManager(transferManager, { from: ctx.owner });
  });

  it('should remove transfer manager', async () => {
    assert.isTrue(await ctx.token.transferManagers(transferManager));
    await ctx.token.removeTransferManager(transferManager, { from: ctx.owner });
    assert.isFalse(await ctx.token.transferManagers(transferManager));
  });

  it('should pass when transfer manager does not exist', async () => {
    assert.isFalse(await ctx.token.transferManagers(otherAccount));
    await ctx.token.removeTransferManager(otherAccount, { from: ctx.owner });
    assert.isFalse(await ctx.token.transferManagers(otherAccount));
  });

  it('should throw when called by non-owner', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.removeTransferManager(transferManager);
    });
  });

  it('should throw when called after release', async () => {
    await ctx.token.release({ from: releaseManager });

    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.removeTransferManager(transferManager, {
        from: ctx.owner
      });
    });
  });
}

export function testRelease(ctx: TokenTestContext<ReleasableToken>) {
  const releaseManager = ctx.accounts[5];
  const otherAccount = ctx.accounts[6];

  beforeEach(async () => {
    await ctx.token.setReleaseManager(releaseManager, { from: ctx.owner });
  });

  it('should set isReleased flag', async () => {
    assert.isFalse(await ctx.token.isReleased());
    await ctx.token.release({ from: releaseManager });
    assert.isTrue(await ctx.token.isReleased());
  });

  it('should throw when called by not release manager', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.release({ from: otherAccount });
    });
  });

  it('should throw when called after release', async () => {
    await ctx.token.release({ from: releaseManager });

    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.release({ from: releaseManager });
    });
  });
}
