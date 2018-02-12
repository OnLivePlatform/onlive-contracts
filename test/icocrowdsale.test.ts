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
  PeriodScheduledEvent,
  PreIcoCrowdsale,
  ScheduledEvent
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
  const dayInSeconds = 24 * 3600;
  const createPeriods = (start: Web3.AnyNumber) => {
    return [
      {
        from: owner,
        price: toWei(0.0011466),
        start
      },
      {
        from: owner,
        price: toWei(0.0011466),
        start: new BigNumber(start).add(2 * dayInSeconds)
      }
    ];
  };
  const createEnd = (start: Web3.AnyNumber) => {
    return new BigNumber(start).add(7 * dayInSeconds);
  };

  const availableAmount = toONL(1000);

  const minValue = toWei(0.1);

  const price = toWei(0.0011466);

  let token: OnLiveToken;

  interface CrowdsaleOptions {
    wallet: Address;
    token: Address;
    availableAmount?: Web3.AnyNumber;
    minValue: Web3.AnyNumber;
    from: Address;
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

  interface ScheduleOptions {
    start: Web3.AnyNumber;
    price: Web3.AnyNumber;
    from: Address;
  }

  async function schedulePricePeriod(
    crowdsale: IcoCrowdsale,
    options?: Partial<ScheduleOptions>
  ) {
    return await crowdsale.schedulePricePeriod(
      propOr(getUnixNow(), 'start', options),
      propOr(price, 'price', options),
      { from: propOr(owner, 'from', options) }
    );
  }

  interface ScheduleAllOptions {
    periods: ScheduleOptions[];
    end: Web3.AnyNumber;
  }

  async function schedule(
    crowdsale: IcoCrowdsale,
    options?: Partial<ScheduleAllOptions>
  ) {
    const periods: ScheduleOptions[] = propOr(
      createPeriods(getUnixNow()),
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
    return Math.round(new Date().getTime() / 1000);
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
      assertNumberEqual(event.price, price);
    });

    for (let i = 0; i < 5; i++) {
      it(`should store ${i + 1} period(s)`, async () => {
        const start = getUnixNow();
        for (let j = 0; j <= i; j++) {
          await schedulePricePeriod(crowdsale, {
            start: start + dayInSeconds * j
          });
        }

        for (let j = 0; j <= i; j++) {
          assertNumberEqual(
            (await crowdsale.pricePeriods(j))[0],
            start + dayInSeconds * j
          );
          assertNumberEqual((await crowdsale.pricePeriods(j))[1], price);
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

    it('should revert for start earlier than last scheduled period', async () => {
      await schedulePricePeriod(crowdsale);
      await assertReverts(async () => {
        await schedulePricePeriod(crowdsale, {
          start: getUnixNow() - dayInSeconds
        });
      });
    });

    it('should revert when crowdsale end is scheduled', async () => {
      const start = getUnixNow();

      await schedulePricePeriod(crowdsale, { start });
      await crowdsale.scheduleCrowdsaleEnd(start + dayInSeconds, {
        from: owner
      });

      await assertReverts(async () => {
        await schedulePricePeriod(crowdsale, {
          start: start + dayInSeconds
        });
      });
    });
  });

  describe('#scheduleCrowdsaleEnd', () => {
    let crowdsale: IcoCrowdsale;
    const end = getUnixNow() + dayInSeconds;

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
    const saleDuration = 1000;

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
      it('should revert when crowdsale end is not scheduled', async () => {
        assert.isFalse(await crowdsale.isCrowdsaleEndScheduled());

        await assertReverts(async () => {
          await contribute(contributor, minValue);
        });
      });

      it('should revert when sale is not active', async () => {
        const start = getUnixNow() + 1 * dayInSeconds;
        const end = start + 7 * dayInSeconds;
        await schedule(crowdsale, { periods: createPeriods(start), end });

        assert.isTrue(await crowdsale.isCrowdsaleEndScheduled());
        assert.isFalse(await crowdsale.isActive());

        await assertReverts(async () => {
          await contribute(contributor, minValue);
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
  });
});
