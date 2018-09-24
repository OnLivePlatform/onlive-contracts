import { BigNumber } from 'bignumber.js';
import { assert } from 'chai';

import * as Web3 from 'web3';

import { CappedMintableToken } from 'onlive';
import { assertReverts, assertTokenEqual } from '../helpers';
import { TokenTestContext } from './context';

declare const web3: Web3;

export function testMint(ctx: TokenTestContext<CappedMintableToken>) {
  const mintingManager = ctx.accounts[0];
  const destinationAccount = ctx.accounts[2];

  let maxSupply: BigNumber;
  let mintableSupply: BigNumber;

  beforeEach(async () => {
    maxSupply = await ctx.token.maxSupply();
    mintableSupply = maxSupply.plus(await ctx.token.totalSupply());
    assert.isTrue(
      mintableSupply.gt(0),
      'precondition: no tokens available to mint'
    );

    await ctx.token.approveMintingManager(mintingManager, { from: ctx.owner });
  });

  it('should pass if not exceeds maxSupply', async () => {
    const expectedSupply = (await ctx.token.totalSupply()).plus(mintableSupply);

    await ctx.token.mint(destinationAccount, mintableSupply, {
      from: mintingManager
    });

    assertTokenEqual(await ctx.token.totalSupply(), expectedSupply);
  });

  it('should revert when exceeds maxSupply', async () => {
    await assertReverts(async () => {
      await ctx.token.mint(destinationAccount, mintableSupply.plus(1), {
        from: mintingManager
      });
    });
  });
}
