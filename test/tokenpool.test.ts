import { assert } from 'chai';
import { propOr } from 'ramda';

import * as Web3 from 'web3';

import {
  OnLiveArtifacts,
  OnLiveToken,
  PoolRegisteredEvent,
  TokenPool,
  TransferredEvent
} from 'onlive';
import { ETH_DECIMALS, toONL } from '../utils';

import { ContractContextDefinition } from 'truffle';
import {
  assertNumberEqual,
  assertReverts,
  findLastLog,
  ZERO_ADDRESS
} from './helpers';

declare const web3: Web3;
declare const artifacts: OnLiveArtifacts;
declare const contract: ContractContextDefinition;

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

  describe('#ctor', () => {
    it('should set token address', async () => {
      const tokenPool = await createTokenPool();
      assert.equal(await tokenPool.token(), token.address);
    });
  });

  describe('#registerPool', () => {
    const poolName = 'testPool';
    const poolTokenAmount = toONL(1);
    let tokenPool: TokenPool;

    beforeEach(async () => {
      tokenPool = await createTokenPool();
      await token.approveMintingManager(tokenPool.address, { from: owner });
    });

    it('should emit PoolRegistered event', async () => {
      const tx = await tokenPool.registerPool(poolName, poolTokenAmount, {
        from: owner
      });

      const log = findLastLog(tx, 'PoolRegistered');
      assert.isOk(log);

      const event = log.args as PoolRegisteredEvent;
      assert.equal(event.pool, poolName);
      assertNumberEqual(event.amount, poolTokenAmount);
    });

    it('should set amount for given pool', async () => {
      await tokenPool.registerPool(poolName, poolTokenAmount, {
        from: owner
      });

      assertNumberEqual(
        await tokenPool.getAvailableAmount(poolName),
        poolTokenAmount
      );
    });

    it('should revert for non-owner', async () => {
      await assertReverts(async () => {
        await tokenPool.registerPool(poolName, poolTokenAmount, {
          from: accounts[1]
        });
      });
    });

    it('should revert for zero amount', async () => {
      await assertReverts(async () => {
        await tokenPool.registerPool(poolName, 0, {
          from: owner
        });
      });
    });

    it('should revert for not unique pool', async () => {
      await tokenPool.registerPool(poolName, poolTokenAmount, {
        from: owner
      });

      await assertReverts(async () => {
        await tokenPool.registerPool(poolName, poolTokenAmount, {
          from: owner
        });
      });
    });
  });

  describe('#transfer', () => {
    const poolName = 'testPool';
    const poolTokenAmount = toONL(1);
    const transferredAmount = toONL(0.43);
    const transferTo = accounts[1];
    let tokenPool: TokenPool;

    beforeEach(async () => {
      tokenPool = await createTokenPool();
      await token.approveMintingManager(tokenPool.address, { from: owner });
      await tokenPool.registerPool(poolName, poolTokenAmount, {
        from: owner
      });
      await token.approveTransferManager(tokenPool.address, { from: owner });
    });

    it('should emit Transferred event', async () => {
      const tx = await tokenPool.transfer(
        transferTo,
        poolName,
        transferredAmount,
        {
          from: owner
        }
      );

      const log = findLastLog(tx, 'Transferred');
      assert.isOk(log);

      const event = log.args as TransferredEvent;
      assert.equal(event.to, transferTo);
      assert.equal(event.pool, poolName);
      assertNumberEqual(event.amount, transferredAmount);
    });

    it('should set new mount for given pool', async () => {
      await tokenPool.transfer(transferTo, poolName, transferredAmount, {
        from: owner
      });

      assertNumberEqual(
        await tokenPool.getAvailableAmount(poolName),
        poolTokenAmount.sub(transferredAmount)
      );
    });

    it('should revert for non-owner', async () => {
      await assertReverts(async () => {
        await tokenPool.transfer(transferTo, poolName, transferredAmount, {
          from: accounts[1]
        });
      });
    });

    it('should revert for invalid address', async () => {
      await assertReverts(async () => {
        await tokenPool.transfer(ZERO_ADDRESS, poolName, transferredAmount, {
          from: owner
        });
      });
    });

    it('should revert for zero amount', async () => {
      await assertReverts(async () => {
        await tokenPool.transfer(transferTo, poolName, 0, {
          from: owner
        });
      });
    });

    it('should revert for amount exceeding limit', async () => {
      await assertReverts(async () => {
        await tokenPool.transfer(transferTo, poolName, toONL(1.1), {
          from: owner
        });
      });
    });
  });
});
