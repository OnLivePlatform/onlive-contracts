import { assert } from 'chai';
import { propOr } from 'ramda';

import * as Web3 from 'web3';

import {
  ExternalCrowdsale,
  MintableToken,
  OnLiveArtifacts,
  PurchaseRegisteredEvent,
  SaleScheduledEvent
} from 'onlive';
import { toONL, Web3Utils } from '../utils';

import { BigNumber } from 'bignumber.js';
import { ContractContextDefinition } from 'truffle';
import { AnyNumber } from 'web3';
import {
  assertNumberEqual,
  assertThrowsInvalidOpcode,
  assertTokenEqual,
  findLastLog
} from './helpers';

declare const web3: Web3;
declare const artifacts: OnLiveArtifacts;
declare const contract: ContractContextDefinition;

interface ScheduleOptions {
  startBlock: AnyNumber;
  endBlock: AnyNumber;
  from: Address;
}

interface PurchaseOptions {
  paymentId: string;
  purchaser: Address;
  amount: AnyNumber;
  from: Address;
}

const utils = new Web3Utils(web3);

const ExternalCrowdsaleContract = artifacts.require('./ExternalCrowdsale.sol');
const MintableTokenContract = artifacts.require('./token/MintableToken.sol');

contract('ExternalCrowdsale', accounts => {
  const owner = accounts[9];
  const nonOwner = accounts[8];

  let token: MintableToken;

  beforeEach(async () => {
    token = await MintableTokenContract.new({ from: owner });
  });

  describe('#ctor', () => {
    it('should set token address', async () => {
      const crowdsale = await ExternalCrowdsaleContract.new(
        token.address,
        toONL(1000),
        { from: owner }
      );
      assert.equal(await crowdsale.token(), token.address);
    });

    it('should set amount of tokens available', async () => {
      const amount = toONL(1000);
      const crowdsale = await ExternalCrowdsaleContract.new(
        token.address,
        amount
      );
      assertTokenEqual(await crowdsale.tokensAvailable(), amount);
    });

    it('should throw when token address is zero', async () => {
      await assertThrowsInvalidOpcode(async () => {
        await ExternalCrowdsaleContract.new('0x0', toONL(1000), {
          from: owner
        });
      });
    });

    it('should throw when available amount is zero', async () => {
      await assertThrowsInvalidOpcode(async () => {
        await ExternalCrowdsaleContract.new(token.address, toONL(0), {
          from: owner
        });
      });
    });
  });

  context('Given deployed token contract', () => {
    const saleDuration = 1000;

    let crowdsale: ExternalCrowdsale;
    let startBlock: number;
    let endBlock: number;

    beforeEach(async () => {
      crowdsale = await ExternalCrowdsaleContract.new(
        token.address,
        toONL(1000),
        { from: owner }
      );
      await token.approveMintingManager(crowdsale.address, { from: owner });
    });

    async function scheduleSale(options?: Partial<ScheduleOptions>) {
      return await crowdsale.scheduleSale(
        propOr(startBlock, 'startBlock', options),
        propOr(endBlock, 'endBlock', options),
        { from: propOr(owner, 'from', options) }
      );
    }

    describe('#scheduleSale', () => {
      beforeEach(async () => {
        startBlock = await utils.getBlockNumber();
        endBlock = startBlock + saleDuration;
      });

      it('should set startBlock', async () => {
        await scheduleSale();
        assertNumberEqual(await crowdsale.startBlock(), startBlock);
      });

      it('should set endBlock', async () => {
        await scheduleSale();
        assertNumberEqual(await crowdsale.endBlock(), endBlock);
      });

      it('should emit SaleScheduled event', async () => {
        const tx = await scheduleSale();

        const log = findLastLog(tx, 'SaleScheduled');
        assert.isOk(log);

        const event = log.args as SaleScheduledEvent;
        assert.isOk(event);
        assertNumberEqual(event.startBlock, startBlock);
        assertNumberEqual(event.endBlock, endBlock);
      });

      it('should throw when start block is zero', async () => {
        await assertThrowsInvalidOpcode(async () => {
          await scheduleSale({ startBlock: new BigNumber(0) });
        });
      });

      it('should throw when end block is zero', async () => {
        await assertThrowsInvalidOpcode(async () => {
          await scheduleSale({ endBlock: new BigNumber(0) });
        });
      });

      it('should throw when end block is equal start block', async () => {
        await assertThrowsInvalidOpcode(async () => {
          await scheduleSale({ endBlock: startBlock });
        });
      });

      it('should throw when end block is lower than start block', async () => {
        await assertThrowsInvalidOpcode(async () => {
          await scheduleSale({ endBlock: startBlock - 1 });
        });
      });

      it('should throw when called by non-owner', async () => {
        await assertThrowsInvalidOpcode(async () => {
          await scheduleSale({ from: nonOwner });
        });
      });

      it('should throw when already scheduled', async () => {
        await scheduleSale();

        await assertThrowsInvalidOpcode(async () => {
          await scheduleSale();
        });
      });
    });

    describe('#registerPurchase', () => {
      const paymentId = '0x414243' + '0'.repeat(58);
      const purchaser = accounts[2];
      const amount = toONL(100);

      async function registerPurchase(options?: Partial<PurchaseOptions>) {
        return await crowdsale.registerPurchase(
          propOr(paymentId, 'paymentId', options),
          propOr(purchaser, 'purchaser', options),
          propOr(amount, 'amount', options),
          { from: propOr(owner, 'from', options) }
        );
      }

      it('should throw when sale is not scheduled', async () => {
        await assertThrowsInvalidOpcode(async () => {
          await registerPurchase();
        });
      });

      it('should throw when sale is not active', async () => {
        const futureStart = (await utils.getBlockNumber()) + 1000;
        await scheduleSale({
          endBlock: futureStart + saleDuration,
          startBlock: futureStart
        });

        assert.isFalse(await crowdsale.isActive());

        await assertThrowsInvalidOpcode(async () => {
          await registerPurchase();
        });
      });

      context('Given sale is active', () => {
        beforeEach(async () => {
          await scheduleSale();

          assert.isTrue(await crowdsale.isActive());
        });

        it('should reduce amount of available tokens', async () => {
          const availableAmount = await crowdsale.tokensAvailable();
          const expectedAmount = availableAmount.sub(amount);
          await registerPurchase();
          assertTokenEqual(await crowdsale.tokensAvailable(), expectedAmount);
        });

        it('should mint tokens for purchaser', async () => {
          const balance = await token.balanceOf(purchaser);
          const expectedBalance = balance.add(amount);
          await registerPurchase();
          assertTokenEqual(await token.balanceOf(purchaser), expectedBalance);
        });

        it('should mark payment id as registered', async () => {
          assert.isFalse(await crowdsale.isPaymentRegistered(paymentId));
          await registerPurchase();
          assert.isTrue(await crowdsale.isPaymentRegistered(paymentId));
        });

        it('should emit PurchaseRegistered event', async () => {
          const tx = await registerPurchase();

          const log = findLastLog(tx, 'PurchaseRegistered');
          assert.isOk(log);

          const event = log.args as PurchaseRegisteredEvent;
          assert.isOk(event);
          assert.equal(event.paymentId, paymentId);
          assert.equal(event.purchaser, purchaser);
          assertTokenEqual(event.amount, amount);
        });

        it('should throw when called by non-owner', async () => {
          await assertThrowsInvalidOpcode(async () => {
            await registerPurchase({ from: nonOwner });
          });
        });

        it('should throw when purchaser address is zero', async () => {
          await assertThrowsInvalidOpcode(async () => {
            await registerPurchase({ purchaser: '0x' + '0'.repeat(40) });
          });
        });

        it('should throw when purchased amount is zero', async () => {
          await assertThrowsInvalidOpcode(async () => {
            await registerPurchase({ amount: 0 });
          });
        });

        it('should throw when payment id is duplicated', async () => {
          const duplicatedPaymentId = '0x123';
          await registerPurchase({ paymentId: duplicatedPaymentId });

          await assertThrowsInvalidOpcode(async () => {
            await registerPurchase({ paymentId: duplicatedPaymentId });
          });
        });
      });
    });
  });
});
