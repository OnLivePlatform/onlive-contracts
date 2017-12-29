import { assert } from 'chai';

import * as Web3 from 'web3';

import {
  ReleasableToken,
  ReleasedEvent,
  ReleaseManagerSetEvent,
  TransferManagerApprovedEvent,
  TransferManagerRevokedEvent
} from 'onlive';
import { toONL } from '../../utils';
import {
  assertThrowsInvalidOpcode,
  assertTokenEqual,
  findLastLog
} from '../helpers';
import { TokenTestContext } from './context';

declare const web3: Web3;

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

  it('should approve transfer manager', async () => {
    assert.isFalse(await ctx.token.transferManagers(transferManager));

    await ctx.token.approveTransferManager(transferManager, {
      from: ctx.owner
    });

    assert.isTrue(await ctx.token.transferManagers(transferManager));
  });

  it('should approve multiple transfer managers', async () => {
    const managers = ctx.accounts.slice(0, 4);
    await Promise.all(
      managers.map(account =>
        ctx.token.approveTransferManager(account, { from: ctx.owner })
      )
    );

    for (const account of managers) {
      assert.isTrue(await ctx.token.transferManagers(account));
    }
  });

  it('should emit TransferManagerApproved event', async () => {
    const tx = await ctx.token.approveTransferManager(transferManager, {
      from: ctx.owner
    });

    const log = findLastLog(tx, 'TransferManagerApproved');
    assert.isOk(log);

    const event = log.args as TransferManagerApprovedEvent;
    assert.isOk(event);
    assert.equal(event.addr, transferManager);
  });

  it('should throw when called by non-owner', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.approveTransferManager(transferManager, {
        from: otherAccount
      });
    });
  });

  it('should throw when called after release', async () => {
    await ctx.token.release({ from: releaseManager });
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.approveTransferManager(otherAccount, { from: ctx.owner });
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
    await ctx.token.approveTransferManager(transferManager, {
      from: ctx.owner
    });
  });

  it('should revoke transfer manager', async () => {
    assert.isTrue(await ctx.token.transferManagers(transferManager));
    await ctx.token.revokeTransferManager(transferManager, { from: ctx.owner });
    assert.isFalse(await ctx.token.transferManagers(transferManager));
  });

  it('should emit TransferManagerRevoked event', async () => {
    const tx = await ctx.token.revokeTransferManager(transferManager, {
      from: ctx.owner
    });

    const log = findLastLog(tx, 'TransferManagerRevoked');
    assert.isOk(log);

    const event = log.args as TransferManagerRevokedEvent;
    assert.isOk(event);
    assert.equal(event.addr, transferManager);
  });

  it('should throw when transfer manager does not exist', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.revokeTransferManager(otherAccount, { from: ctx.owner });
    });
  });

  it('should throw when called by non-owner', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.revokeTransferManager(transferManager, {
        from: otherAccount
      });
    });
  });

  it('should throw when called after release', async () => {
    await ctx.token.release({ from: releaseManager });

    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.revokeTransferManager(transferManager, {
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

  it('should set released flag', async () => {
    assert.isFalse(await ctx.token.released());
    await ctx.token.release({ from: releaseManager });
    assert.isTrue(await ctx.token.released());
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

export function testTransfer(
  ctx: TokenTestContext<ReleasableToken>,
  sourceAccount: Address
) {
  const releaseManager = ctx.accounts[0];
  const destinationAccount = ctx.accounts[1];

  beforeEach(async () => {
    await ctx.token.setReleaseManager(releaseManager, { from: ctx.owner });
  });

  it('should change balances when released', async () => {
    await ctx.token.release({ from: releaseManager });

    const amount = toONL(1);

    const expectedDestinationBalance = (await ctx.token.balanceOf(
      destinationAccount
    )).add(amount);

    const expectedSourceBalance = (await ctx.token.balanceOf(
      sourceAccount
    )).sub(amount);

    await ctx.token.transfer(destinationAccount, amount, {
      from: sourceAccount
    });

    assertTokenEqual(
      await ctx.token.balanceOf(destinationAccount),
      expectedDestinationBalance
    );

    assertTokenEqual(
      await ctx.token.balanceOf(sourceAccount),
      expectedSourceBalance
    );
  });

  it('should throw when not released', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.transfer(destinationAccount, toONL(1), {
        from: sourceAccount
      });
    });
  });
}

export function testTransferFrom(
  ctx: TokenTestContext<ReleasableToken>,
  sourceAccount: Address
) {
  const releaseManager = ctx.accounts[0];
  const destinationAccount = ctx.accounts[1];
  const approvedAccount = ctx.accounts[2];
  const amount = toONL(1);

  beforeEach(async () => {
    await ctx.token.setReleaseManager(releaseManager, { from: ctx.owner });
    await ctx.token.approve(approvedAccount, amount, { from: sourceAccount });
  });

  it('should change balances when released', async () => {
    await ctx.token.release({ from: releaseManager });

    const expectedDestinationBalance = (await ctx.token.balanceOf(
      destinationAccount
    )).add(amount);

    const expectedSourceBalance = (await ctx.token.balanceOf(
      sourceAccount
    )).sub(amount);

    await ctx.token.transferFrom(sourceAccount, destinationAccount, amount, {
      from: approvedAccount
    });

    assertTokenEqual(
      await ctx.token.balanceOf(destinationAccount),
      expectedDestinationBalance
    );

    assertTokenEqual(
      await ctx.token.balanceOf(sourceAccount),
      expectedSourceBalance
    );
  });

  it('should throw when not released', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.transferFrom(sourceAccount, destinationAccount, amount, {
        from: approvedAccount
      });
    });
  });
}
