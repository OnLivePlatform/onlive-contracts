import { assert } from 'chai';

import * as Web3 from 'web3';

import { BurnableToken, BurnedEvent, TransferEvent } from 'onlive';
import { TokenTestContext } from './context';
import { Web3Utils } from '../../utils';
import {
  assertEtherEqual,
  assertThrowsInvalidOpcode,
  findLastLog
} from '../helpers';
import { BigNumber } from 'bignumber.js';

declare const web3: Web3;

const utils = new Web3Utils(web3);

export function testBurn(ctx: TokenTestContext<BurnableToken>) {
  const burner = ctx.holder;

  it('should reduce total supply', async () => {
    const value = utils.toEther(1);
    const expectedSupply = (await ctx.token.totalSupply()).sub(value);

    await ctx.token.burn(value, { from: burner });
    assertEtherEqual(ctx.token.totalSupply(), expectedSupply);
  });

  it('should reduce sender balance', async () => {
    const value = utils.toEther(1);
    const expectedBalance = (await ctx.token.balanceOf(burner)).sub(value);

    await ctx.token.burn(value, { from: burner });
    assertEtherEqual(ctx.token.totalSupply(), expectedBalance);
  });

  it('should emit Burned event', async () => {
    const value = utils.toEther(1);
    const tx = await ctx.token.burn(value, {
      from: burner
    });

    const log = findLastLog(tx, 'Burned');
    assert.isOk(log);

    const event = log.args as BurnedEvent;
    assert.isOk(event);
    assert.equal(event.from, burner);
    assertEtherEqual(event.value, value);
  });

  it('should emit Transfer event', async () => {
    const value = utils.toEther(1);
    const tx = await ctx.token.burn(value, {
      from: burner
    });

    const log = findLastLog(tx, 'Transfer');
    assert.isOk(log);

    const event = log.args as TransferEvent;
    assert.isOk(event);
    assert.equal(new BigNumber(event.from), new BigNumber(0x0));
    assert.equal(event.to, burner);
    assertEtherEqual(event.value, value);
  });

  it('should throw when insufficient balance', async () => {
    const balance = await ctx.token.balanceOf(burner);
    const value = balance.add(utils.toEther(1));

    await assertThrowsInvalidOpcode(async () => {
      await ctx.token.burn(value, { from: burner });
    });
  });
}
