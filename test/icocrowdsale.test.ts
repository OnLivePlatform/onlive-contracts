import { assert } from 'chai';
import { propOr } from 'ramda';

import * as Web3 from 'web3';

import {
  ContributionAcceptedEvent,
  ContributionRegisteredEvent,
  IcoCrowdsale,
  OnLiveArtifacts,
  OnLiveToken,
  ScheduledEvent, TimeScheduledEvent
} from 'onlive';
import { ETH_DECIMALS, shiftNumber, toONL, toWei, Web3Utils } from '../utils';

import { BigNumber } from 'bignumber.js';
import { ContractContextDefinition, TransactionResult } from 'truffle';
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

const IcoCrowdsaleContract = artifacts.require('./IcoCrowdsale.sol');
const OnLiveTokenContract = artifacts.require('./OnLiveToken.sol');

contract('IcoCrowdsale', accounts => {
  const owner = accounts[9];
  const nonOwner = accounts[8];
  const contributor = accounts[7];
  const wallet = accounts[6];
  const periodsStarts = [
    100
  ];
  const periodsPrices = [
    toWei(0.0011466)
  ];
  const availableAmount = toONL(1000);
  const minValue = toWei(0.1);

  let token: OnLiveToken;

  interface CrowdsaleOptions {
    wallet: Address;
    token: Address;
    availableAmount?: Web3.AnyNumber;
    minValue: Web3.AnyNumber;
    pricePeriodsStart: Web3.AnyNumber[];
    pricePeriodsPrice: Web3.AnyNumber[];
    from: Address;
  }

  async function createCrowdsale(options?: Partial<CrowdsaleOptions>) {
    return await IcoCrowdsaleContract.new(
      propOr(wallet, 'wallet', options),
      propOr(token.address, 'token', options),
      propOr(availableAmount, 'availableAmount', options),
      propOr(minValue, 'minValue', options),
      propOr(periodsStarts, 'pricePeriodsStart', options),
      propOr(periodsPrices, 'pricePeriodsPrice', options),
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
    it('should set wallet address', async () => {
      const crowdsale = await createCrowdsale();
      assert.equal(await crowdsale.token(), token.address);
    });

    it('should set token address', async () => {
      const crowdsale = await createCrowdsale();
      assert.equal(await crowdsale.token(), token.address);
    });

    it('should set amount of tokens available', async () => {
      const crowdsale = await createCrowdsale();
      assertTokenEqual(await crowdsale.availableAmount(), availableAmount);
    });

    it('should set minimum contribution value', async () => {
      const crowdsale = await createCrowdsale();
      assertTokenEqual(await crowdsale.minValue(), minValue);
    });

    it('should set token prices', async () => {
      assert.fail();
    });

    it('should revert when wallet address is zero', async () => {
      await assertReverts(async () => {
        await createCrowdsale({ wallet: '0x0' });
      });
    });

    it('should revert when token address is zero', async () => {
      await assertReverts(async () => {
        await createCrowdsale({ token: '0x0' });
      });
    });

    it('should revert when available amount is zero', async () => {
      await assertReverts(async () => {
        await createCrowdsale({ availableAmount: toWei(0) });
      });
    });

    it('should revert when prices length is zero', async () => {
      assert.fail();
      await assertReverts(async () => {
        await createCrowdsale({
          pricePeriodsPrice: [],
          pricePeriodsStart: []
        });
      });
    });
  });

  context('Given deployed token contract', () => {
    const saleDuration = 60 * 60 * 24 * 10;

    let crowdsale: IcoCrowdsale;
    let start: number;
    let end: number;

    beforeEach(async () => {
      start = Math.floor(Date.now() / 1000);
      end = start + saleDuration;

      crowdsale = await IcoCrowdsaleContract.new(
        wallet,
        token.address,
        toONL(1000),
        minValue,
        periodsStarts,
        periodsPrices,
        {
          from: owner
        }
      );
      await token.approveMintingManager(crowdsale.address, { from: owner });
    });

    interface ScheduleOptions {
      start: Web3.AnyNumber;
      end: Web3.AnyNumber;
      from: Address;
    }

    async function schedule(options?: Partial<ScheduleOptions>) {
      return await crowdsale.schedule(
        propOr(start, 'start', options),
        propOr(end, 'end', options),
        { from: propOr(owner, 'from', options) }
      );
    }

    describe('#schedule', () => {
      it('should set start', async () => {
        await schedule();
        assertNumberEqual(await crowdsale.start(), start);
      });

      it('should set end', async () => {
        await schedule();
        assertNumberEqual(await crowdsale.end(), end);
      });

      it('should emit SaleScheduled event', async () => {
        const tx = await schedule();

        const log = findLastLog(tx, 'Scheduled');
        assert.isOk(log);

        const event = log.args as TimeScheduledEvent;
        assert.isOk(event);
        assertNumberEqual(event.start, start);
        assertNumberEqual(event.end, end);
      });

      it('should revert when start is zero', async () => {
        await assertReverts(async () => {
          await schedule({ start: new BigNumber(0) });
        });
      });

      it('should revert when end is zero', async () => {
        await assertReverts(async () => {
          await schedule({ end: new BigNumber(0) });
        });
      });

      it('should revert when end is equal start', async () => {
        await assertReverts(async () => {
          await schedule({ end: start });
        });
      });

      it('should revert when end is lower than start', async () => {
        await assertReverts(async () => {
          await schedule({ end: start - 1 });
        });
      });

      it('should revert when called by non-owner', async () => {
        await assertReverts(async () => {
          await schedule({ from: nonOwner });
        });
      });

      it('should revert when already scheduled', async () => {
        await schedule();

        await assertReverts(async () => {
          await schedule();
        });
      });
    });

    type ContributionFunction = (
      from: Address,
      value: Web3.AnyNumber
    ) => Promise<TransactionResult>;

    function testContribute(contribute: ContributionFunction) {
      it('should revert when sale is not scheduled', async () => {
        assert.isFalse(await crowdsale.isScheduled());

        await assertReverts(async () => {
          await contribute(contributor, minValue);
        });
      });

      it('should revert when sale is not active', async () => {
        const futureStart = start + saleDuration;
        await schedule({
          end: futureStart + saleDuration,
          start: futureStart
        });

        assert.isFalse(await crowdsale.isActive());

        await assertReverts(async () => {
          await contribute(contributor, minValue);
        });
      });

      context('Given sale is active', () => {
        beforeEach(async () => {
          await schedule();

          assert.isTrue(await crowdsale.isScheduled());
          assert.isTrue(await crowdsale.isActive());
        });

        it('should forward funds to wallet', async () => {
          const prevBalance = await utils.getBalance(wallet);
          const tx = await contribute(contributor, minValue);
          assertEtherEqual(
            await utils.getBalance(wallet),
            prevBalance.add(minValue)
          );
        });

        const acceptableError = toONL(shiftNumber(1, -9));
        const conversions = [
          { eth: 0.1, onl: 87.2143729287 },
          { eth: 0.5, onl: 436.071864643 },
          { eth: 1, onl: 872.143729287 }
        ];

        for (const { eth, onl } of conversions) {
          context(`Given contribution of ${eth} ETH`, () => {
            it(`should assign ${onl} ONL`, async () => {
              const prevBalance = await token.balanceOf(contributor);
              const expectedAmount = toONL(onl);

              await contribute(contributor, toWei(eth));

              assertTokenAlmostEqual(
                await token.balanceOf(contributor),
                prevBalance.add(expectedAmount),
                acceptableError
              );
            });

            it(`should emit ContributionAccepted event`, async () => {
              const value = toWei(eth);
              const expectedAmount = toONL(onl);

              const tx = await contribute(contributor, value);

              const log = findLastLog(tx, 'ContributionAccepted');
              assert.isOk(log);

              const event = log.args as ContributionAcceptedEvent;
              assert.isOk(event);
              assert.equal(event.contributor, contributor);
              assertEtherEqual(event.value, value);
              assertTokenAlmostEqual(
                event.amount,
                expectedAmount,
                acceptableError
              );
            });
          });
        }

        it('should revert when value is zero', async () => {
          await assertReverts(async () => {
            await contribute(contributor, toWei(0));
          });
        });

        it('should revert when value is below threshold', async () => {
          await assertReverts(async () => {
            await contribute(contributor, minValue.sub(1));
          });
        });

        it('should revert when there is not enough tokens', async () => {
          const bigValue = toWei(2);
          const expectedAmount = await crowdsale.calculateContribution(
            bigValue
          );
          assert.isTrue(expectedAmount.gt(availableAmount));

          await assertReverts(async () => {
            await contribute(contributor, bigValue);
          });
        });
      });
    }

    describe('#fallback', () => {
      testContribute((from: Address, value: Web3.AnyNumber) => {
        return crowdsale.sendTransaction({ from, value });
      });
    });

    describe('#contribute', () => {
      testContribute((from: Address, value: Web3.AnyNumber) => {
        return crowdsale.contribute(contributor, { from: nonOwner, value });
      });

      it('should revert when contributor address is zero', async () => {
        await assertReverts(async () => {
          await crowdsale.contribute('0x0', {
            from: nonOwner,
            value: minValue
          });
        });
      });
    });

    describe('#registerContribution', () => {
      const id = '0x414243' + '0'.repeat(58);
      const amount = toONL(100);

      interface ContributionOptions {
        id: string;
        contributor: Address;
        amount: Web3.AnyNumber;
        from: Address;
      }

      async function registerContribution(
        options?: Partial<ContributionOptions>
      ) {
        return await crowdsale.registerContribution(
          propOr(id, 'id', options),
          propOr(contributor, 'contributor', options),
          propOr(amount, 'amount', options),
          { from: propOr(owner, 'from', options) }
        );
      }

      it('should revert when sale is not scheduled', async () => {
        await assertReverts(async () => {
          await registerContribution();
        });
      });

      it('should revert when sale is not active', async () => {
        const futureStart = (await utils.getBlockNumber()) + 1000;
        await schedule({
          end: futureStart + saleDuration,
          start: futureStart
        });

        assert.isFalse(await crowdsale.isActive());

        await assertReverts(async () => {
          await registerContribution();
        });
      });

      context('Given sale is active', () => {
        beforeEach(async () => {
          await schedule();

          assert.isTrue(await crowdsale.isScheduled());
          assert.isTrue(await crowdsale.isActive());
        });

        it('should reduce amount of available tokens', async () => {
          const expectedAmount = availableAmount.sub(amount);
          await registerContribution();
          assertTokenEqual(await crowdsale.availableAmount(), expectedAmount);
        });

        it('should mint tokens for contributor', async () => {
          const balance = await token.balanceOf(contributor);
          const expectedBalance = balance.add(amount);
          await registerContribution();
          assertTokenEqual(await token.balanceOf(contributor), expectedBalance);
        });

        it('should mark id as registered', async () => {
          assert.isFalse(await crowdsale.isContributionRegistered(id));
          await registerContribution();
          assert.isTrue(await crowdsale.isContributionRegistered(id));
        });

        it('should emit ContributionRegistered event', async () => {
          const tx = await registerContribution();

          const log = findLastLog(tx, 'ContributionRegistered');
          assert.isOk(log);

          const event = log.args as ContributionRegisteredEvent;
          assert.isOk(event);
          assert.equal(event.id, id);
          assert.equal(event.contributor, contributor);
          assertTokenEqual(event.amount, amount);
        });

        it('should revert when called by non-owner', async () => {
          await assertReverts(async () => {
            await registerContribution({ from: nonOwner });
          });
        });

        it('should revert when contributor address is zero', async () => {
          await assertReverts(async () => {
            await registerContribution({ contributor: ZERO_ADDRESS });
          });
        });

        it('should revert when amount is zero', async () => {
          await assertReverts(async () => {
            await registerContribution({ amount: 0 });
          });
        });

        it('should revert when amount exceeds availability', async () => {
          await assertReverts(async () => {
            await registerContribution({ amount: availableAmount.add(1) });
          });
        });

        it('should revert when id is duplicated', async () => {
          const duplicatedId = '0x123';
          await registerContribution({ id: duplicatedId });

          await assertReverts(async () => {
            await registerContribution({ id: duplicatedId });
          });
        });
      });
    });
  });
});
