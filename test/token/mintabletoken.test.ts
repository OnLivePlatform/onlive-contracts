import { assert } from 'chai';
import { without } from 'ramda';

import * as Web3 from 'web3';

import {
  MintableToken,
  MintedEvent,
  MintingFinishedEvent,
  MintingManagerAddedEvent,
  MintingManagerRemovedEvent,
  OnLiveArtifacts,
  TransferEvent
} from 'onlive';
import { ContractContextDefinition } from 'truffle';
import { Web3Utils } from '../../utils';
import {
  assertEtherEqual,
  assertThrowsInvalidOpcode,
  findLastLog
} from '../helpers';
import { TokenTestContext } from './context';

declare const web3: Web3;
declare const artifacts: OnLiveArtifacts;
declare const contract: ContractContextDefinition;

const MintableTokenContract = artifacts.require('./token/MintableToken.sol');

const utils = new Web3Utils(web3);

contract('ReleasableToken', accounts => {
  const owner = accounts[9];
  const holder = accounts[8];
  const ctx = new TokenTestContext<MintableToken>(
    without([owner, holder], accounts),
    owner,
    holder
  );

  beforeEach(async () => {
    ctx.token = await MintableTokenContract.new({ from: ctx.owner });
  });

  describe('#mint', () => testMint(ctx));
  describe('#addMintingManager', () => testAddMintingManager(ctx));
  describe('#removeMintingManager', () => testRemoveMintingManager(ctx));
  describe('#finishMinting', () => testFinishMinting(ctx));
});

export function testAddMintingManager(ctx: TokenTestContext<MintableToken>) {
  const mintingManager = ctx.accounts[0];
  const otherAccount = ctx.accounts[1];

  it('should add minting manager', async () => {
    assert.isFalse(await ctx.token.mintingManagers(mintingManager));
    await ctx.token.addMintingManager(mintingManager, { from: ctx.owner });
    assert.isTrue(await ctx.token.mintingManagers(mintingManager));
  });

  it('should add multiple minting managers', async () => {
    const managers = ctx.accounts.slice(0, 4);
    await Promise.all(
      managers.map(account =>
        ctx.token.addMintingManager(account, { from: ctx.owner })
      )
    );

    for (const account of managers) {
      assert.isTrue(await ctx.token.mintingManagers(account));
    }
  });

  it('should emit MintingManagerAdded event', async () => {
    const tx = await ctx.token.addMintingManager(mintingManager, {
      from: ctx.owner
    });

    const log = findLastLog(tx, 'MintingManagerAdded');
    assert.isOk(log);

    const event = log.args as MintingManagerAddedEvent;
    assert.isOk(event);
    assert.equal(event.addr, mintingManager);
  });

  it('should throw when called by non-owner', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.addMintingManager(mintingManager, { from: otherAccount });
    });
  });

  it('should throw when called after finished minting', async () => {
    await ctx.token.finishMinting({ from: ctx.owner });

    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.addMintingManager(otherAccount, { from: ctx.owner });
    });
  });
}

export function testRemoveMintingManager(ctx: TokenTestContext<MintableToken>) {
  const mintingManager = ctx.accounts[0];
  const otherAccount = ctx.accounts[1];

  beforeEach(async () => {
    await ctx.token.addMintingManager(mintingManager, { from: ctx.owner });
  });

  it('should remove minting manager', async () => {
    assert.isTrue(await ctx.token.mintingManagers(mintingManager));
    await ctx.token.removeMintingManager(mintingManager, { from: ctx.owner });
    assert.isFalse(await ctx.token.mintingManagers(mintingManager));
  });

  it('should emit MintingManagerRemoved event', async () => {
    const tx = await ctx.token.removeMintingManager(mintingManager, {
      from: ctx.owner
    });

    const log = findLastLog(tx, 'MintingManagerRemoved');
    assert.isOk(log);

    const event = log.args as MintingManagerRemovedEvent;
    assert.isOk(event);
    assert.equal(event.addr, mintingManager);
  });

  it('should throw when minting manager does not exist', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.removeMintingManager(otherAccount, { from: ctx.owner });
    });
  });

  it('should throw when called by non-owner', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.removeMintingManager(mintingManager, {
        from: otherAccount
      });
    });
  });

  it('should throw when called after finished minting', async () => {
    await ctx.token.finishMinting({ from: ctx.owner });

    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.removeMintingManager(mintingManager, {
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
    await ctx.token.addMintingManager(mintingManager, { from: ctx.owner });
  });

  it('should increase total supply', async () => {
    const value = utils.toEther(1);
    const expectedSupply = (await ctx.token.totalSupply()).add(value);

    await ctx.token.mint(destinationAccount, value, { from: mintingManager });

    assertEtherEqual(await ctx.token.totalSupply(), expectedSupply);
  });

  it('should increase balance of destination account', async () => {
    const value = utils.toEther(1);
    const expectedValue = (await ctx.token.balanceOf(destinationAccount)).add(
      value
    );

    await ctx.token.mint(destinationAccount, value, { from: mintingManager });

    assertEtherEqual(
      await ctx.token.balanceOf(destinationAccount),
      expectedValue
    );
  });

  it('should emit Minted event', async () => {
    const value = utils.toEther(1);
    const tx = await ctx.token.mint(destinationAccount, value, {
      from: mintingManager
    });

    const log = findLastLog(tx, 'Minted');
    assert.isOk(log);

    const event = log.args as MintedEvent;
    assert.isOk(event);
    assert.equal(event.to, destinationAccount);
    assertEtherEqual(event.value, value);
  });

  it('should emit Transfer event', async () => {
    const value = utils.toEther(1);
    const tx = await ctx.token.mint(destinationAccount, value, {
      from: mintingManager
    });

    const log = findLastLog(tx, 'Transfer');
    assert.isOk(log);

    const event = log.args as TransferEvent;
    assert.isOk(event);
    assert.equal(event.from, ctx.token.address);
    assert.equal(event.to, destinationAccount);
    assertEtherEqual(event.value, value);
  });

  it('should throw when minting is finished', async () => {
    await ctx.token.finishMinting({ from: ctx.owner });

    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.mint(destinationAccount, utils.toEther(1), {
        from: mintingManager
      });
    });
  });

  it('should throw when called by not minting manager', async () => {
    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.mint(destinationAccount, utils.toEther(1), {
        from: otherAccount
      });
    });
  });
}

export function testFinishMinting(ctx: TokenTestContext<MintableToken>) {
  const otherAccount = ctx.accounts[0];

  it('should set isMintingFinished flag', async () => {
    assert.isFalse(await ctx.token.isMintingFinished());
    await ctx.token.finishMinting({ from: ctx.owner });
    assert.isTrue(await ctx.token.isMintingFinished());
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
