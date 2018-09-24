import { assert } from 'chai';
import { propOr } from 'ramda';

import * as Web3 from 'web3';

import * as tempo from '@digix/tempo';

import {
  OnLiveArtifacts,
  OnLiveToken,
  PoolLockedEvent,
  PoolRegisteredEvent,
  PoolTransferredEvent,
  TokenPool,
  TransferEvent
} from 'onlive';
import { ETH_DECIMALS, toONL } from '../utils';

import { ContractContextDefinition } from 'truffle';
import {
  assertNumberEqual,
  assertReverts,
  findLastLog,
  getNetworkTimestamp,
  ZERO_ADDRESS
} from './helpers';

declare const web3: Web3;
declare const artifacts: OnLiveArtifacts;
declare const contract: ContractContextDefinition;

const TokenPoolContract = artifacts.require('./TokenPool.sol');
const OnLiveTokenContract = artifacts.require('./OnLiveToken.sol');
TokenPoolContract.link(OnLiveTokenContract);

const wait = tempo(web3).wait;

contract('TokenPool', accounts => {
  const owner = accounts[9];
  const nonOwner = accounts[1];

  const poolId = 'testPool';
  const availableAmount = toONL(1000);
  const lockPeriod = 24 * 60 * 60;
  let lockTimestamp = 0;

  let token: OnLiveToken;

  async function createTokenPool(options?: any) {
    return await TokenPoolContract.new(
      propOr(token.address, 'token', options),
      { from: propOr(owner, 'from', options) }
    );
  }

  beforeEach(async () => {
    lockTimestamp = (await getNetworkTimestamp()) + lockPeriod;

    token = await OnLiveTokenContract.new(
      'OnLive Token',
      'ONL',
      availableAmount,
      {
        from: owner
      }
    );

    assertNumberEqual(await token.decimals(), ETH_DECIMALS);
  });

  describe('#ctor', () => {
    it('should set token address', async () => {
      const tokenPool = await createTokenPool();
      assert.equal(await tokenPool.token(), token.address);
    });
  });

  context('Given deployed TokenPool contract', () => {
    let tokenPool: TokenPool;

    async function registerPool(options?: any) {
      return await tokenPool.registerPool(
        propOr(poolId, 'name', options),
        propOr(availableAmount, 'availableAmount', options),
        propOr(0, 'lockTimestamp', options),
        { from: propOr(owner, 'from', options) }
      );
    }

    beforeEach(async () => {
      tokenPool = await createTokenPool();
      await token.approveMintingManager(tokenPool.address, { from: owner });
      await token.approveTransferManager(tokenPool.address, { from: owner });
    });

    describe('#registerPool', () => {
      it('should set amount of available tokens', async () => {
        await registerPool();

        assertNumberEqual(
          await tokenPool.getAvailableAmount(poolId),
          availableAmount
        );
      });

      it('should set lock timestamp', async () => {
        await registerPool({ lockTimestamp });

        assertNumberEqual(
          await tokenPool.getLockTimestamp(poolId),
          lockTimestamp
        );
      });

      it('should set lock timestamp to zero if not locked', async () => {
        await registerPool();

        assertNumberEqual(await tokenPool.getLockTimestamp(poolId), 0);
      });

      it('should emit PoolRegistered event', async () => {
        const tx = await registerPool();

        const log = findLastLog(tx, 'PoolRegistered');
        assert.isOk(log);

        const event = log.args as PoolRegisteredEvent;
        assert.equal(event.poolId, poolId);
        assertNumberEqual(event.amount, availableAmount);
        assertNumberEqual(await tokenPool.getLockTimestamp(poolId), 0);
      });

      it('should emit PoolLocked event', async () => {
        const tx = await registerPool({ lockTimestamp });

        const log = findLastLog(tx, 'PoolLocked');
        assert.isOk(log);

        const event = log.args as PoolLockedEvent;
        assert.equal(event.poolId, poolId);
        assertNumberEqual(event.lockTimestamp, lockTimestamp);
      });

      it('should revert for non-owner', async () => {
        await assertReverts(async () => {
          await registerPool({ from: nonOwner });
        });
      });

      it('should revert for zero amount', async () => {
        await assertReverts(async () => {
          await registerPool({ availableAmount: 0 });
        });
      });

      it('should revert for non-unique pool', async () => {
        await registerPool();

        await assertReverts(async () => {
          await registerPool();
        });
      });
    });

    describe('#transfer', () => {
      const amount = toONL(0.5);
      const beneficiary = accounts[5];

      async function transferFromPool(options?: any) {
        return await tokenPool.transfer(
          propOr(poolId, 'poolId', options),
          propOr(beneficiary, 'to', options),
          propOr(amount, 'amount', options),
          { from: propOr(owner, 'from', options) }
        );
      }

      context('from unlocked pool', () => {
        beforeEach(async () => {
          await registerPool();
        });

        it('should update available amount of tokens', async () => {
          await transferFromPool();

          assertNumberEqual(
            await tokenPool.getAvailableAmount(poolId),
            availableAmount.minus(amount)
          );
        });

        it('should emit Transfer event', async () => {
          const tx = await transferFromPool();

          const log = findLastLog(tx, 'Transfer');
          assert.isOk(log);

          const event = log.args as TransferEvent;
          assert.equal(event.from, tokenPool.address);
          assert.equal(event.to, beneficiary);
          assertNumberEqual(event.value, amount);
        });

        it('should emit PoolTransferred event', async () => {
          const tx = await transferFromPool();

          const log = findLastLog(tx, 'PoolTransferred');
          assert.isOk(log);

          const event = log.args as PoolTransferredEvent;
          assert.equal(event.poolId, poolId);
          assert.equal(event.to, beneficiary);
          assertNumberEqual(event.amount, amount);
        });

        it('should revert for non-owner', async () => {
          await assertReverts(async () => {
            await transferFromPool({ from: nonOwner });
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
            await transferFromPool({
              amount: availableAmount.plus(toONL(0.1))
            });
          });
        });
      });

      context('from locked pool', () => {
        it('should revert for valid parameters', async () => {
          await registerPool({ lockTimestamp });

          await assertReverts(async () => {
            await transferFromPool();
          });
        });
      });

      context('from pool with expired lock timestamp', () => {
        beforeEach(async () => {
          await registerPool({ lockTimestamp });

          const offsetInSeconds = 1;
          await wait(lockPeriod + offsetInSeconds);
        });

        it('should update available amount of tokens', async () => {
          await transferFromPool();

          assertNumberEqual(
            await tokenPool.getAvailableAmount(poolId),
            availableAmount.minus(amount)
          );
        });

        it('should emit Transfer event', async () => {
          const tx = await transferFromPool();

          const log = findLastLog(tx, 'Transfer');
          assert.isOk(log);

          const event = log.args as TransferEvent;
          assert.equal(event.from, tokenPool.address);
          assert.equal(event.to, beneficiary);
          assertNumberEqual(event.value, amount);
        });
      });
    });
  });
});
