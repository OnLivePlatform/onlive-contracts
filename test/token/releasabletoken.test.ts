import { assert } from 'chai';
import { without } from 'ramda';

import * as Web3 from 'web3';

import {
  OnLiveArtifacts,
  ReleasableToken,
  ReleasedEvent,
  ReleaseManagerSetEvent,
  TransferManagerAddedEvent,
  TransferManagerRemovedEvent
} from 'onlive';
import { ContractContextDefinition } from 'truffle';
import { assertThrowsInvalidOpcode, findLastLog } from '../helpers';
import { TokenTestContext } from './context';

declare const web3: Web3;
declare const artifacts: OnLiveArtifacts;
declare const contract: ContractContextDefinition;

const ReleasableTokenContract = artifacts.require(
  './token/ReleasableToken.sol'
);

contract('ReleasableToken', accounts => {
  const owner = accounts[9];
  const holder = accounts[8];
  const ctx = new TokenTestContext<ReleasableToken>(
    without([owner, holder], accounts),
    owner,
    holder
  );

  beforeEach(async () => {
    ctx.token = await ReleasableTokenContract.new({ from: ctx.owner });
  });

  describe('#setReleaseManager', () => testSetReleaseManager(ctx));
  describe('#addTransferManager', () => testAddTransferManager(ctx));
  describe('#removeTransferManager', () => testRemoveTransferManager(ctx));
  describe('#release', () => testRelease(ctx));
});

export function testSetReleaseManager(ctx: TokenTestContext<ReleasableToken>) {
  const releaseManager = ctx.accounts[0];
  const otherAccount = ctx.accounts[1];

  it('should set release manager', async () => {
    assert.notEqual(await ctx.token.releaseManager(), releaseManager);
    await ctx.token.setReleaseManager(releaseManager, { from: ctx.owner });
    assert.equal(await ctx.token.releaseManager(), releaseManager);
  });

  it('should emit ReleaseManagerSet event', async () => {
    const tx = await ctx.token.setReleaseManager(releaseManager, {
      from: ctx.owner
    });

    const log = findLastLog(tx, 'ReleaseManagerSet');
    assert.isOk(log);

    const event = log.args as ReleaseManagerSetEvent;
    assert.isOk(event);
    assert.equal(event.addr, releaseManager);
  });

  it('should throw when called by non-owner', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.setReleaseManager(releaseManager, { from: otherAccount });
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
  const releaseManager = ctx.accounts[0];
  const transferManager = ctx.accounts[1];
  const otherAccount = ctx.accounts[2];

  beforeEach(async () => {
    await ctx.token.setReleaseManager(releaseManager, { from: ctx.owner });
  });

  it('should add transfer manager', async () => {
    assert.isFalse(await ctx.token.transferManagers(transferManager));
    await ctx.token.addTransferManager(transferManager, { from: ctx.owner });
    assert.isTrue(await ctx.token.transferManagers(transferManager));
  });

  it('should add multiple transfer managers', async () => {
    const managers = ctx.accounts.slice(0, 4);
    await Promise.all(
      managers.map(account =>
        ctx.token.addTransferManager(account, { from: ctx.owner })
      )
    );

    for (const account of managers) {
      assert.isTrue(await ctx.token.transferManagers(account));
    }
  });

  it('should emit TransferManagerAdded event', async () => {
    const tx = await ctx.token.addTransferManager(transferManager, {
      from: ctx.owner
    });

    const log = findLastLog(tx, 'TransferManagerAdded');
    assert.isOk(log);

    const event = log.args as TransferManagerAddedEvent;
    assert.isOk(event);
    assert.equal(event.addr, transferManager);
  });

  it('should throw when called by non-owner', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.addTransferManager(transferManager, {
        from: otherAccount
      });
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
  const releaseManager = ctx.accounts[0];
  const transferManager = ctx.accounts[1];
  const otherAccount = ctx.accounts[2];

  beforeEach(async () => {
    await ctx.token.setReleaseManager(releaseManager, { from: ctx.owner });
    await ctx.token.addTransferManager(transferManager, { from: ctx.owner });
  });

  it('should remove transfer manager', async () => {
    assert.isTrue(await ctx.token.transferManagers(transferManager));
    await ctx.token.removeTransferManager(transferManager, { from: ctx.owner });
    assert.isFalse(await ctx.token.transferManagers(transferManager));
  });

  it('should emit TransferManagerRemoved event', async () => {
    const tx = await ctx.token.removeTransferManager(transferManager, {
      from: ctx.owner
    });

    const log = findLastLog(tx, 'TransferManagerRemoved');
    assert.isOk(log);

    const event = log.args as TransferManagerRemovedEvent;
    assert.isOk(event);
    assert.equal(event.addr, transferManager);
  });

  it('should throw when transfer manager does not exist', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.removeTransferManager(otherAccount, { from: ctx.owner });
    });
  });

  it('should throw when called by non-owner', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.removeTransferManager(transferManager, {
        from: otherAccount
      });
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
  const releaseManager = ctx.accounts[0];
  const otherAccount = ctx.accounts[1];

  beforeEach(async () => {
    await ctx.token.setReleaseManager(releaseManager, { from: ctx.owner });
  });

  it('should set isReleased flag', async () => {
    assert.isFalse(await ctx.token.isReleased());
    await ctx.token.release({ from: releaseManager });
    assert.isTrue(await ctx.token.isReleased());
  });

  it('should emit Released event', async () => {
    const tx = await ctx.token.release({ from: releaseManager });

    const log = findLastLog(tx, 'Released');
    assert.isOk(log);

    const event = log.args as ReleasedEvent;
    assert.isOk(event);
  });

  it('should throw when called by not release manager', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.release({ from: otherAccount });
    });
  });

  it('should throw when called after being released', async () => {
    await ctx.token.release({ from: releaseManager });

    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.release({ from: releaseManager });
    });
  });
}
