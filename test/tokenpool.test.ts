import { assert } from 'chai';
import { propOr } from 'ramda';

import * as Web3 from 'web3';

import {
  OnLiveArtifacts,
  OnLiveToken,
  PoolRegisteredEvent,
  TokenPool
} from 'onlive';
import { ETH_DECIMALS, shiftNumber, toONL, toWei, Web3Utils } from '../utils';

import { BigNumber } from 'bignumber.js';
import { ContractContextDefinition, TransactionResult } from 'truffle';
import { AnyNumber } from 'web3';
import {
  assertEtherEqual,
  assertNumberEqual,
  assertReverts,
  assertTokenAlmostEqual,
  assertTokenEqual,
  findLastLog,
  ZERO_ADDRESS
} from './helpers';

declare const web3: Web3;
declare const artifacts: OnLiveArtifacts;
declare const contract: ContractContextDefinition;

const utils = new Web3Utils(web3);

const TokenPoolContract = artifacts.require('./TokenPool.sol');
const OnLiveTokenContract = artifacts.require('./OnLiveToken.sol');

contract('TokenPool', accounts => {
  const owner = accounts[0];

  let token: OnLiveToken;

  async function createTokenPool(options?: any) {
    return await TokenPoolContract.new(
      propOr(token.address, 'token', options),
      { from: propOr(owner, 'from', options) }
    );
  }

  beforeEach(async () => {
    token = await OnLiveTokenContract.new('OnLive Token', 'ONL', toONL(1000), {
      from: owner
    });

    assertNumberEqual(await token.decimals(), ETH_DECIMALS);
  });

  describe.only('#ctor', () => {
    it('should set token address', async () => {
      const tokenPool = await createTokenPool();
      assert.equal(await tokenPool.token(), token.address);
    });
  });

  describe.only('#register', () => {
    const poolName = 'testPool';
    const poolTokenAmount = toONL(10);
    let tokenPool: TokenPool;

    beforeEach(async () => {
      tokenPool = await createTokenPool();
    });

    it('should revert for non-owner', async () => {
      await assertReverts(async () => {
        await tokenPool.register(poolName, poolTokenAmount, {
          from: accounts[1]
        });
      });
    });

    it('should emit PoolRegisteredEvent', async () => {
      const tx = await tokenPool.register(poolName, 0, {
        from: owner
      });

      const log = findLastLog(tx, 'PoolRegistered');
      assert.isOk(log);

      const event = log.args as PoolRegisteredEvent;
      assert.isOk(event);
    });
  });
});
