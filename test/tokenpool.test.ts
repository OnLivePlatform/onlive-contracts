import { assert } from 'chai';
import { propOr } from 'ramda';

import * as Web3 from 'web3';

import * as tempo from '@digix/tempo';

import {
  OnLiveArtifacts,
  OnLiveToken,
  PoolLockedEvent,
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

  const poolName = 'testPool';
  const poolTokenAmount = toONL(1);

  const dayInSeconds = 24 * 3600;

  let tokenPool: TokenPool;
  let token: OnLiveToken;

  async function createTokenPool(options?: any) {
    return await TokenPoolContract.new(
      propOr(token.address, 'token', options),
      { from: propOr(owner, 'from', options) }
    );
  }

  async function registerPool(options?: any) {
    return await tokenPool.registerPool(
      propOr(poolName, 'name', options),
      propOr(poolTokenAmount, 'amount', options),
      propOr(0, 'lockTimestamp', options),
      { from: propOr(owner, 'from', options) }
    );
  }

  function getUnixNow() {
    return Math.round(new Date().getTime() / 1000);
  }

  beforeEach(async () => {
    token = await OnLiveTokenContract.new('OnLive Token', 'ONL', toONL(1000), {
      from: owner
    });

    assertNumberEqual(await token.decimals(), ETH_DECIMALS);
  });

  describe('#ctor', () => {
    it('should set token address', async () => {
      tokenPool = await createTokenPool();
      assert.equal(await tokenPool.token(), token.address);
    });
  });

  describe('#registerPool', () => {
    beforeEach(async () => {
      tokenPool = await createTokenPool();
      await token.approveMintingManager(tokenPool.address, { from: owner });
    });

    it('should emit PoolRegistered event', async () => {
      const tx = await registerPool();

      const log = findLastLog(tx, 'PoolRegistered');
      assert.isOk(log);

      const event = log.args as PoolRegisteredEvent;
      assert.equal(event.pool, poolName);
      assertNumberEqual(event.amount, poolTokenAmount);
      assertNumberEqual(await tokenPool.getLockTimestamp(poolName), 0);
    });

    it('should emit PoolLocked event', async () => {
      const lockTimestamp = getUnixNow() + dayInSeconds;
      const tx = await registerPool({ lockTimestamp });

      const log = findLastLog(tx, 'PoolLocked');
      assert.isOk(log);

      const event = log.args as PoolLockedEvent;
      assert.equal(event.pool, poolName);
      assertNumberEqual(event.timestamp, lockTimestamp);
      assertNumberEqual(
        event.timestamp,
        await tokenPool.getLockTimestamp(poolName)
      );
    });

    it('should set amount of given pool', async () => {
      await registerPool();

      assertNumberEqual(
        await tokenPool.getAvailableAmount(poolName),
        poolTokenAmount
      );
    });

    it('should set lockTimestamp of given pool', async () => {
      const lockTimestamp = getUnixNow() + dayInSeconds;
      await registerPool({ lockTimestamp });

      assert.notEqual(await tokenPool.getLockTimestamp(poolName), 0);
    });

    it('should revert for non-owner', async () => {
      await assertReverts(async () => {
        await registerPool({ from: accounts[1] });
      });
    });

    it('should revert for zero amount', async () => {
      await assertReverts(async () => {
        await registerPool({ amount: 0 });
      });
    });

    it('should revert for not unique pool', async () => {
      await registerPool();

      await assertReverts(async () => {
        await registerPool();
      });
    });
  });

  describe('#transfer', () => {
    const transferredAmount = toONL(0.43);
    const transferTo = accounts[1];

    async function transferFromPool(options?: any) {
      return await tokenPool.transfer(
        propOr(transferTo, 'to', options),
        propOr(poolName, 'pool', options),
        propOr(transferredAmount, 'amount', options),
        { from: propOr(owner, 'from', options) }
      );
    }

    beforeEach(async () => {
      tokenPool = await createTokenPool();
      await token.approveMintingManager(tokenPool.address, { from: owner });
      await token.approveTransferManager(tokenPool.address, { from: owner });
    });

    it('should revert for non-owner', async () => {
      await assertReverts(async () => {
        await transferFromPool({ from: accounts[1] });
      });
    });

    it('should revert for invalid address', async () => {
      await assertReverts(async () => {
        await transferFromPool({ to: ZERO_ADDRESS });
      });
    });

    it('should revert for zero amount', async () => {
      await assertReverts(async () => {
        await transferFromPool({ amount: 0 });
      });
    });

    it('should revert for amount exceeding limit', async () => {
      await assertReverts(async () => {
        await transferFromPool({ amount: poolTokenAmount.add(toONL(0.1)) });
      });
    });

    context('from unlocked pool', () => {
      beforeEach(async () => {
        await registerPool();
      });

      it('should emit Transferred event', async () => {
        const tx = await transferFromPool();

        const log = findLastLog(tx, 'Transferred');
        assert.isOk(log);

        const event = log.args as TransferredEvent;
        assert.equal(event.to, transferTo);
        assert.equal(event.pool, poolName);
        assertNumberEqual(event.amount, transferredAmount);
      });

      it('should set new amount for given pool', async () => {
        await transferFromPool();

        assertNumberEqual(
          await tokenPool.getAvailableAmount(poolName),
          poolTokenAmount.sub(transferredAmount)
        );
      });
    });

    context('from locked pool', () => {
      it('should revert for valid parameters', async () => {
        const lockTimestamp = getUnixNow() + dayInSeconds;
        await registerPool({ lockTimestamp });

        await assertReverts(async () => {
          await transferFromPool();
        });
      });
    });

    context('from pool with expired lock timestamp', () => {
      const waitUntilLockExpire = tempo(web3).wait;
      const waitTime = 20;
      let networkTimeshift = 0;

      beforeEach(async () => {
        const lockTimestamp = getUnixNow() + 1 + networkTimeshift;
        await registerPool({ lockTimestamp });
        // assures if lock is active
        await assertReverts(async () => {
          await transferFromPool();
        });

        await waitUntilLockExpire(waitTime);
        networkTimeshift += waitTime;
      });

      it('should emit Transferred event', async () => {
        const tx = await transferFromPool();

        const log = findLastLog(tx, 'Transferred');
        assert.isOk(log);

        const event = log.args as TransferredEvent;
        assert.equal(event.to, transferTo);
        assert.equal(event.pool, poolName);
        assertNumberEqual(event.amount, transferredAmount);
      });

      it('should set new amount for given pool', async () => {
        await transferFromPool();

        assertNumberEqual(
          await tokenPool.getAvailableAmount(poolName),
          poolTokenAmount.sub(transferredAmount)
        );
      });
    });
  });
});
