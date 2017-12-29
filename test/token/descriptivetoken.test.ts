import { assert } from 'chai';

import * as Web3 from 'web3';

import { DescriptionChangedEvent, DescriptiveToken } from 'onlive';
import { assertReverts, findLastLog } from '../helpers';
import { TokenTestContext } from './context';

declare const web3: Web3;

export function testChangeDescription(ctx: TokenTestContext<DescriptiveToken>) {
  const name = 'New Name';
  const symbol = 'New Symbol';

  it('should change name', async () => {
    await ctx.token.changeDescription(name, symbol, {
      from: ctx.owner
    });

    assert.equal(await ctx.token.name(), name);
  });

  it('should change symbol', async () => {
    await ctx.token.changeDescription(name, symbol, {
      from: ctx.owner
    });

    assert.equal(await ctx.token.symbol(), symbol);
  });

  it('should emit DescriptionChanged event', async () => {
    const tx = await ctx.token.changeDescription(name, symbol, {
      from: ctx.owner
    });

    const log = findLastLog(tx, 'DescriptionChanged');
    assert.isOk(log);

    const event = log.args as DescriptionChangedEvent;
    assert.isOk(event);
    assert.equal(event.name, name);
    assert.equal(event.symbol, symbol);
  });

  it('should revert when called by non-owner', async () => {
    const otherAccount = ctx.accounts[0];

    await assertReverts(async () => {
      await ctx.token.changeDescription(name, symbol, {
        from: otherAccount
      });
    });
  });
}
