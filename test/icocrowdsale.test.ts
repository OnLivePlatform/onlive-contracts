import { assert } from 'chai';
import { propOr } from 'ramda';

import * as Web3 from 'web3';

import * as tempo from '@digix/tempo';

import {
  ContributionAcceptedEvent,
  ContributionRegisteredEvent,
  CrowdsaleEndScheduledEvent,
  IcoCrowdsale,
  OnLiveArtifacts,
  OnLiveToken,
  PeriodScheduledEvent
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
  calculateContribution,
  DAY_IN_SECONDS,
  findLastLog,
  sendRpc,
  ZERO_ADDRESS
} from './helpers';

import { AnyNumber } from 'web3';

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

  const defaultPeriodsCount = 3;
  const defaultPrice = toWei(0.0011466);
  const availableAmount = toONL(10000);
  const minValue = toWei(0.1);

  let token: OnLiveToken;
  let snapshotId: number;
  let networkTimeshift: number = 0;

  before(async () => {
    const response = await sendRpc('evm_snapshot');
    snapshotId = (response as any).result;
  });

  beforeEach(async () => {
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
  });

  describe('#schedulePricePeriod', () => {
    let crowdsale: IcoCrowdsale;
    let periods: ScheduleOptions[];

    beforeEach(async () => {
      crowdsale = await createCrowdsale();
    });

    it('should emit PeriodScheduled event', async () => {
      const start = getUnixNow();

      const tx = await schedulePricePeriod(crowdsale, { start });

      const log = findLastLog(tx, 'PeriodScheduled');
      assert.isOk(log);

      const event = log.args as PeriodScheduledEvent;
      assert.isOk(event);
      assertNumberEqual(event.start, start);
      assertNumberEqual(event.price, defaultPrice);
    });

    for (let i = 0; i < 5; i++) {
      it(`should store ${i + 1} period(s)`, async () => {
        const start = getUnixNow();
        periods = createPeriodsOrDefault({ count: i, start });

        await periods.forEach(async period => {
          await schedulePricePeriod(crowdsale, period as ScheduleOptions);
        });

        for (let p = 0; p < periods.length; p++) {
          const period = await crowdsale.pricePeriods(p);
          assertNumberEqual(period[0], periods[p].start);
          assertNumberEqual(period[1], periods[p].price);
        }
      });
    }

    it('should revert for not owner', async () => {
      await assertReverts(async () => {
        await schedulePricePeriod(crowdsale, { from: accounts[1] });
      });
    });

    it('should revert for zero start', async () => {
      await assertReverts(async () => {
        await schedulePricePeriod(crowdsale, { start: 0 });
      });
    });

    it('should revert for zero price', async () => {
      await assertReverts(async () => {
        await schedulePricePeriod(crowdsale, { price: 0 });
      });
    });

    it('should revert for start earlier than last period', async () => {
      await schedulePricePeriod(crowdsale);
      await assertReverts(async () => {
        await schedulePricePeriod(crowdsale, {
          start: getUnixNow() - DAY_IN_SECONDS
        });
      });
    });

    it('should revert when crowdsale end is scheduled', async () => {
      const start = getUnixNow();

      await schedulePricePeriod(crowdsale, { start });
      await crowdsale.scheduleCrowdsaleEnd(start + DAY_IN_SECONDS, {
        from: owner
      });

      await assertReverts(async () => {
        await schedulePricePeriod(crowdsale, {
          start: start + DAY_IN_SECONDS
        });
      });
    });
  });

  describe('#scheduleCrowdsaleEnd', () => {
    let crowdsale: IcoCrowdsale;
    const end = getUnixNow() + DAY_IN_SECONDS;

    beforeEach(async () => {
      crowdsale = await createCrowdsale();
    });

    it('should emit CrowdsaleEndScheduled event', async () => {
      await schedulePricePeriod(crowdsale);

      const tx = await crowdsale.scheduleCrowdsaleEnd(end, { from: owner });

      const log = findLastLog(tx, 'CrowdsaleEndScheduled');
      assert.isOk(log);

      const event = log.args as CrowdsaleEndScheduledEvent;
      assert.isOk(event);
      assertNumberEqual(event.end, end);
    });

    it('should set crowdale end', async () => {
      await schedulePricePeriod(crowdsale);

      await crowdsale.scheduleCrowdsaleEnd(end, { from: owner });

      assertNumberEqual(await crowdsale.end(), end);
    });

    it('should revert for not owner', async () => {
      await schedulePricePeriod(crowdsale);

      await assertReverts(async () => {
        await crowdsale.scheduleCrowdsaleEnd(end, { from: accounts[1] });
      });
    });

    it('should revert for zero end', async () => {
      await schedulePricePeriod(crowdsale);

      await assertReverts(async () => {
        await crowdsale.scheduleCrowdsaleEnd(0, { from: owner });
      });
    });

    it('should revert when no periods are scheduled', async () => {
      await assertReverts(async () => {
        await crowdsale.scheduleCrowdsaleEnd(end, {
          from: owner
        });
      });
    });
  });

  context('Given deployed token contract', () => {
    let crowdsale: IcoCrowdsale;

    beforeEach(async () => {
      crowdsale = await createCrowdsale();
      await token.approveMintingManager(crowdsale.address, { from: owner });
    });

    type ContributionFunction = (
      from: Address,
      value: Web3.AnyNumber
    ) => Promise<TransactionResult>;

    function testContribute(contribute: ContributionFunction) {
      it('should revert when is not scheduled', async () => {
        assert.isFalse(await crowdsale.isCrowdsaleEndScheduled());

        await assertReverts(async () => {
          await contribute(contributor, minValue);
        });
      });

      it('should revert when sale is not active', async () => {
        const start = getUnixNow() + 1 * DAY_IN_SECONDS;
        const end = start + 7 * DAY_IN_SECONDS;
        const periods = createPeriodsOrDefault({ start });
        await schedule(crowdsale, { periods, end });

        assert.isTrue(await crowdsale.isCrowdsaleEndScheduled());
        assert.isFalse(await crowdsale.isActive());

        await assertReverts(async () => {
          await contribute(contributor, minValue);
        });
      });

      context('Given sale is active', () => {
        let periods: ScheduleOptions[];

        beforeEach(async () => {
          const start = getUnixNow() - 3600;
          const end = start + 7 * DAY_IN_SECONDS;
          const periodsCount = 3;
          periods = createPeriodsOrDefault({ start, count: periodsCount });
          await schedule(crowdsale, { periods, end });

          assert.isTrue(await crowdsale.isCrowdsaleEndScheduled());
          assert.isTrue(await crowdsale.isActive());
        });

        it('should forward funds to wallet', async () => {
          const prevBalance = await utils.getBalance(wallet);
          await contribute(contributor, minValue);
          assertEtherEqual(
            await utils.getBalance(wallet),
            prevBalance.add(minValue)
          );
        });

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
          const bigValue = toWei(20);
          const expectedAmount = await crowdsale.calculateContribution(
            bigValue
          );
          assert.isTrue(expectedAmount.gt(availableAmount));

          await assertReverts(async () => {
            await contribute(contributor, bigValue);
          });
        });
      });

      context('Periods changes', async () => {
        const acceptableError = toONL(shiftNumber(1, -9));
        const periodInterval = DAY_IN_SECONDS;

        async function setup() {
          const start = getUnixNow() - 3600;
          const end = start + 7 * DAY_IN_SECONDS;
          const periodsCount = 3;
          const periods = createPeriodsOrDefault({
            count: periodsCount,
            interval: periodInterval,
            start
          });
          await schedule(crowdsale, { periods, end });

          assert.isTrue(await crowdsale.isCrowdsaleEndScheduled());
          assert.isTrue(await crowdsale.isActive());
          return periods;
        }

        type PeriodContributionFunction = (
          period: ScheduleOptions,
          value: Web3.AnyNumber
        ) => Promise<void>;

        async function testContributeForAllPeriod(
          testFunction: PeriodContributionFunction
        ) {
          const periods = await setup();
          const waitUntilNextPeriod = tempo(web3).wait;

          for (const period of periods) {
            const contributionAmounts = [0.1, 0.5, 1];
            for (const eth of contributionAmounts) {
              await testFunction(period, eth);
            }

            await waitUntilNextPeriod(periodInterval);
            networkTimeshift += periodInterval;
          }
        }

        it('should assign ONL to contributor in all periods', async () => {
          await testContributeForAllPeriod(
            async (period: ScheduleOptions, eth: Web3.AnyNumber) => {
              const prevBalance = await token.balanceOf(contributor);
              const expectedAmount = toONL(
                calculateContribution(eth, period.price)
              );
              await contribute(contributor, toWei(eth));

              assertTokenAlmostEqual(
                await token.balanceOf(contributor),
                prevBalance.add(expectedAmount),
                acceptableError
              );
            }
          );
        });

        it(`should emit ContributionAccepted in all periods`, async () => {
          await testContributeForAllPeriod(
            async (period: ScheduleOptions, eth: Web3.AnyNumber) => {
              const value = toWei(eth);
              const expectedAmount = toONL(
                calculateContribution(eth, period.price)
              );

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
            }
          );
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
        assert.isFalse(await crowdsale.isCrowdsaleEndScheduled());

        await assertReverts(async () => {
          await registerContribution();
        });
      });

      it('should revert when sale is not active', async () => {
        const start = getUnixNow() + 1 * DAY_IN_SECONDS;
        const end = start + 7 * DAY_IN_SECONDS;
        await schedule(crowdsale, {
          end,
          periods: createPeriodsOrDefault({ start })
        });

        assert.isFalse(await crowdsale.isActive());

        await assertReverts(async () => {
          await registerContribution();
        });
      });

      context('Given sale is active', () => {
        beforeEach(async () => {
          const start = getUnixNow() - 3600;
          const end = start + 7 * DAY_IN_SECONDS;
          await schedule(crowdsale, {
            end,
            periods: createPeriodsOrDefault({ start })
          });

          assert.isTrue(await crowdsale.isCrowdsaleEndScheduled());
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

  after(async () => {
    await sendRpc('evm_revert', [snapshotId]);
  });

  function createPeriodsOrDefault(options?: any) {
    const start = new BigNumber(propOr(
      getUnixNow(),
      'start',
      options
    ) as Web3.AnyNumber);
    const price = new BigNumber(propOr(
      defaultPrice,
      'price',
      options
    ) as Web3.AnyNumber);
    const periodsCount = propOr(defaultPeriodsCount, 'count', options);
    const periodInterval = new BigNumber(propOr(
      DAY_IN_SECONDS,
      'interval',
      options
    ) as Web3.AnyNumber);

    const periods = [];
    for (let i = 0; i < periodsCount; i++) {
      periods.push({
        from: propOr(owner, 'owner', options),
        price: price.add(toWei(0.0001).mul(i)),
        start: start.add(periodInterval.mul(i))
      } as ScheduleOptions);
    }

    return periods;
  }

  function createEnd(start: Web3.AnyNumber) {
    return new BigNumber(start).add(7 * DAY_IN_SECONDS);
  }

  async function createCrowdsale(options?: Partial<CrowdsaleOptions>) {
    return await IcoCrowdsaleContract.new(
      propOr(wallet, 'wallet', options),
      propOr(token.address, 'token', options),
      propOr(availableAmount, 'availableAmount', options),
      propOr(minValue, 'minValue', options),
      { from: propOr(owner, 'from', options) }
    );
  }

  async function schedulePricePeriod(
    crowdsale: IcoCrowdsale,
    options?: Partial<ScheduleOptions>
  ) {
    return await crowdsale.schedulePricePeriod(
      propOr(getUnixNow(), 'start', options),
      propOr(defaultPrice, 'price', options),
      { from: propOr(owner, 'from', options) }
    );
  }

  async function schedule(
    crowdsale: IcoCrowdsale,
    options?: Partial<ScheduleAllOptions>
  ) {
    const periods: ScheduleOptions[] = propOr(
      createPeriodsOrDefault(getUnixNow()),
      'periods',
      options
    );
    await periods.forEach(async period => {
      await schedulePricePeriod(crowdsale, period);
    });
    await crowdsale.scheduleCrowdsaleEnd(
      propOr(createEnd(periods[0].start), 'end', options),
      { from: owner }
    );
  }

  function getUnixNow() {
    return Math.round(new Date().getTime() / 1000) + networkTimeshift;
  }
});

interface ScheduleOptions {
  start: Web3.AnyNumber;
  price: Web3.AnyNumber;
  from: Address;
}

interface CrowdsaleOptions {
  wallet: Address;
  token: Address;
  availableAmount?: Web3.AnyNumber;
  minValue: Web3.AnyNumber;
  from: Address;
}

interface ContributionOptions {
  id: string;
  contributor: Address;
  amount: AnyNumber;
  from: Address;
}

interface ScheduleAllOptions {
  periods: ScheduleOptions[];
  end: Web3.AnyNumber;
}
