import { assert } from 'chai';
import { propOr } from 'ramda';

import * as Web3 from 'web3';

import * as tempo from '@digix/tempo';

import {
  ContributionAcceptedEvent,
  ContributionRegisteredEvent,
  IcoCrowdsale,
  OnLiveArtifacts,
  OnLiveToken,
  PeriodScheduledEvent,
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
import { AnyNumber } from 'web3';

declare const web3: Web3;
declare const artifacts: OnLiveArtifacts;
declare const contract: ContractContextDefinition;

const utils = new Web3Utils(web3);

const IcoCrowdsaleContract = artifacts.require('./IcoCrowdsale.sol');
const OnLiveTokenContract = artifacts.require('./OnLiveToken.sol');

contract('IcoCrowdsale', accounts => {
  const owner = accounts[9];
  const wallet = accounts[6];

  const dayInSeconds = 24 * 3600;

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
    start: AnyNumber;
    price: AnyNumber;
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

    it('should store new period', async () => {
      const start = getUnixNow();
      await schedulePricePeriod(crowdsale, { start });

      assertNumberEqual((await crowdsale.pricePeriods(0))[0], start);
      assertNumberEqual((await crowdsale.pricePeriods(0))[1], price);
    });

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

    it('should revert for start earlier than existing period', async () => {
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
      await crowdsale.scheduleCrowdsaleEnd(start + dayInSeconds, { from: owner})

      await assertReverts(async () => {
        await schedulePricePeriod(crowdsale, {
          start: start + dayInSeconds
        });
      });
    });
  });
});
