import { assert } from 'chai';

import * as Web3 from 'web3';

import {
  MintableToken,
  MintedEvent,
  MintingFinishedEvent,
  MintingManagerApprovedEvent,
  MintingManagerRevokedEvent,
  TransferEvent
} from 'onlive';
import { toONL } from '../../utils';
import {
  assertThrowsInvalidOpcode,
  assertTokenEqual,
  findLastLog
} from '../helpers';
import { TokenTestContext } from './context';

declare const web3: Web3;

export function testAddMintingManager(ctx: TokenTestContext<MintableToken>) {
  const mintingManager = ctx.accounts[0];
  const otherAccount = ctx.accounts[1];

  it('should approve minting manager', async () => {
    assert.isFalse(await ctx.token.mintingManagers(mintingManager));

    await ctx.token.approveMintingManager(mintingManager, { from: ctx.owner });

    assert.isTrue(await ctx.token.mintingManagers(mintingManager));
  });

  it('should approve multiple minting managers', async () => {
    const managers = ctx.accounts.slice(0, 4);
    await Promise.all(
      managers.map(account =>
        ctx.token.approveMintingManager(account, { from: ctx.owner })
      )
    );

    for (const account of managers) {
      assert.isTrue(await ctx.token.mintingManagers(account));
    }
  });

  it('should emit MintingManagerApproved event', async () => {
    const tx = await ctx.token.approveMintingManager(mintingManager, {
      from: ctx.owner
    });

    const log = findLastLog(tx, 'MintingManagerApproved');
    assert.isOk(log);

    const event = log.args as MintingManagerApprovedEvent;
    assert.isOk(event);
    assert.equal(event.addr, mintingManager);
  });

  it('should throw when called by non-owner', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.approveMintingManager(mintingManager, {
        from: otherAccount
      });
    });
  });

  it('should throw when called after finished minting', async () => {
    await ctx.token.finishMinting({ from: ctx.owner });

    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.approveMintingManager(otherAccount, { from: ctx.owner });
    });
  });
}

export function testRemoveMintingManager(ctx: TokenTestContext<MintableToken>) {
  const mintingManager = ctx.accounts[0];
  const otherAccount = ctx.accounts[1];

  beforeEach(async () => {
    await ctx.token.approveMintingManager(mintingManager, { from: ctx.owner });
  });

  it('should revoke minting manager', async () => {
    assert.isTrue(await ctx.token.mintingManagers(mintingManager));
    await ctx.token.revokeMintingManager(mintingManager, { from: ctx.owner });
    assert.isFalse(await ctx.token.mintingManagers(mintingManager));
  });

  it('should emit MintingManagerRevoked event', async () => {
    const tx = await ctx.token.revokeMintingManager(mintingManager, {
      from: ctx.owner
    });

    const log = findLastLog(tx, 'MintingManagerRevoked');
    assert.isOk(log);

    const event = log.args as MintingManagerRevokedEvent;
    assert.isOk(event);
    assert.equal(event.addr, mintingManager);
  });

  it('should throw when minting manager does not exist', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.revokeMintingManager(otherAccount, { from: ctx.owner });
    });
  });

  it('should throw when called by non-owner', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.revokeMintingManager(mintingManager, {
        from: otherAccount
      });
    });
  });

  it('should throw when called after finished minting', async () => {
    await ctx.token.finishMinting({ from: ctx.owner });

    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.revokeMintingManager(mintingManager, {
        from: ctx.owner
      });
    });
  });
}

export function testMint(ctx: TokenTestContext<MintableToken>) {
  const mintingManager = ctx.accounts[0];
  const otherAccount = ctx.accounts[1];
  const destinationAccount = ctx.accounts[2];

  beforeEach(async () => {
    await ctx.token.approveMintingManager(mintingManager, { from: ctx.owner });
  });

  it('should increase total supply', async () => {
    const amount = toONL(1);
    const expectedSupply = (await ctx.token.totalSupply()).add(amount);

    await ctx.token.mint(destinationAccount, amount, { from: mintingManager });

    assertTokenEqual(await ctx.token.totalSupply(), expectedSupply);
  });

  it('should increase balance of destination account', async () => {
    const amount = toONL(1);
    const expectedValue = (await ctx.token.balanceOf(destinationAccount)).add(
      amount
    );

    await ctx.token.mint(destinationAccount, amount, { from: mintingManager });

    assertTokenEqual(
      await ctx.token.balanceOf(destinationAccount),
      expectedValue
    );
  });

  it('should emit Minted event', async () => {
    const amount = toONL(1);
    const tx = await ctx.token.mint(destinationAccount, amount, {
      from: mintingManager
    });

    const log = findLastLog(tx, 'Minted');
    assert.isOk(log);

    const event = log.args as MintedEvent;
    assert.isOk(event);
    assert.equal(event.to, destinationAccount);
    assertTokenEqual(event.amount, amount);
  });

  it('should emit Transfer event', async () => {
    const amount = toONL(1);
    const tx = await ctx.token.mint(destinationAccount, amount, {
      from: mintingManager
    });

    const log = findLastLog(tx, 'Transfer');
    assert.isOk(log);

    const event = log.args as TransferEvent;
    assert.isOk(event);
    assert.equal(event.from, '0x' + '0'.repeat(40));
    assert.equal(event.to, destinationAccount);
    assertTokenEqual(event.value, amount);
  });

  it('should throw when minting is finished', async () => {
    await ctx.token.finishMinting({ from: ctx.owner });

    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.mint(destinationAccount, toONL(1), {
        from: mintingManager
      });
    });
  });

  it('should throw when called by not minting manager', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.mint(destinationAccount, toONL(1), {
        from: otherAccount
      });
    });
  });
}

export function testFinishMinting(ctx: TokenTestContext<MintableToken>) {
  const otherAccount = ctx.accounts[0];

  it('should set mintingFinished flag', async () => {
    assert.isFalse(await ctx.token.mintingFinished());
    await ctx.token.finishMinting({ from: ctx.owner });
    assert.isTrue(await ctx.token.mintingFinished());
  });

  it('should emit MintingFinished event', async () => {
    const tx = await ctx.token.finishMinting({ from: ctx.owner });

    const log = findLastLog(tx, 'MintingFinished');
    assert.isOk(log);

    const event = log.args as MintingFinishedEvent;
    assert.isOk(event);
  });

  it('should throw when called by not release manager', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.finishMinting({ from: otherAccount });
    });
  });

  it('should throw when called after finished minting', async () => {
    await ctx.token.finishMinting({ from: ctx.owner });

    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.finishMinting({ from: ctx.owner });
    });
  });
}
