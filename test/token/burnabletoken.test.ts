import { assert } from 'chai';

import * as Web3 from 'web3';

import { BurnableToken, BurnedEvent, TransferEvent } from 'onlive';
import { toONL } from '../../utils';
import { assertReverts, assertTokenEqual, findLastLog } from '../helpers';
import { TokenTestContext } from './context';

declare const web3: Web3;

export function testBurn(
  ctx: TokenTestContext<BurnableToken>,
  burnerAccount: Address
) {
  it('should reduce total supply', async () => {
    const amount = toONL(1);
    const expectedSupply = (await ctx.token.totalSupply()).sub(amount);

    await ctx.token.burn(amount, { from: burnerAccount });
    assertTokenEqual(await ctx.token.totalSupply(), expectedSupply);
  });

  it('should reduce sender balance', async () => {
    const amount = toONL(1);
    const expectedBalance = (await ctx.token.balanceOf(burnerAccount)).sub(
      amount
    );

    await ctx.token.burn(amount, { from: burnerAccount });
    assertTokenEqual(await ctx.token.totalSupply(), expectedBalance);
  });

  it('should emit Burned event', async () => {
    const amount = toONL(1);
    const tx = await ctx.token.burn(amount, {
      from: burnerAccount
    });

    const log = findLastLog(tx, 'Burned');
    assert.isOk(log);

    const event = log.args as BurnedEvent;
    assert.isOk(event);
    assert.equal(event.from, burnerAccount);
    assertTokenEqual(event.amount, amount);
  });

  it('should emit Transfer event', async () => {
    const amount = toONL(1);
    const tx = await ctx.token.burn(amount, {
      from: burnerAccount
    });

    const log = findLastLog(tx, 'Transfer');
    assert.isOk(log);

    const event = log.args as TransferEvent;
    assert.isOk(event);
    assert.equal(event.from, burnerAccount);
    assert.equal(event.to, '0x' + '0'.repeat(40));
    assertTokenEqual(event.value, amount);
  });

  it('should revert when insufficient balance', async () => {
    const balance = await ctx.token.balanceOf(burnerAccount);
    const value = balance.add(toONL(1));

    await assertReverts(async () => {
      await ctx.token.burn(value, { from: burnerAccount });
    });
  });
}
