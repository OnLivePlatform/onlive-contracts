import { assert } from 'chai';
import { propOr } from 'ramda';

import * as Web3 from 'web3';

import * as tempo from '@digix/tempo';

import {
  ContributionAcceptedEvent,
  ContributionRegisteredEvent,
  CrowdsaleEndScheduledEvent,
  IcoCrowdsale,
  LeftTokensBurnedEvent,
  MintableToken,
  OnLiveArtifacts,
  OnLiveToken,
  StageScheduledEvent
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

  const defaultStagesCount = 3;
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

    it('should set minimum contribution value', async () => {
      const crowdsale = await createCrowdsale();
      assertTokenEqual(await crowdsale.minValue(), minValue);
    });

    it('should set available amount to zero', async () => {
      const crowdsale = await createCrowdsale();
      assertTokenEqual(await crowdsale.availableAmount(), 0);
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
  });

  describe('#scheduleStage', () => {
    let crowdsale: IcoCrowdsale;
    let stages: ScheduleStageOptions[];

    beforeEach(async () => {
      crowdsale = await createCrowdsale();
    });

    it('should emit StageScheduled event', async () => {
      const start = getUnixNow();

      const tx = await scheduleStage(crowdsale, { start });

      const log = findLastLog(tx, 'StageScheduled');
      assert.isOk(log);

      const event = log.args as StageScheduledEvent;
      assert.isOk(event);
      assertNumberEqual(event.start, start);
      assertNumberEqual(event.price, defaultPrice);
    });

    for (let i = 0; i < 5; i++) {
      it(`should store ${i + 1} stage(s)`, async () => {
        const start = getUnixNow();
        stages = createStagesOrDefault({ count: i, start });

        await stages.forEach(async stage => {
          await scheduleStage(crowdsale, stage as ScheduleStageOptions);
        });

        for (let p = 0; p < stages.length; p++) {
          const currentStage = await crowdsale.stages(p);
          assertNumberEqual(currentStage[0], stages[p].start);
          assertNumberEqual(currentStage[1], stages[p].price);
        }
      });
    }

    it('should revert for not owner', async () => {
      await assertReverts(async () => {
        await scheduleStage(crowdsale, { from: accounts[1] });
      });
    });

    it('should revert for zero start', async () => {
      await assertReverts(async () => {
        await scheduleStage(crowdsale, { start: 0 });
      });
    });

    it('should revert for zero price', async () => {
      await assertReverts(async () => {
        await scheduleStage(crowdsale, { price: 0 });
      });
    });

    it('should revert for start earlier than last stage', async () => {
      await scheduleStage(crowdsale);
      await assertReverts(async () => {
        await scheduleStage(crowdsale, {
          start: getUnixNow() - DAY_IN_SECONDS
        });
      });
    });

    it('should revert when crowdsale end is scheduled', async () => {
      const start = getUnixNow();

      await scheduleStage(crowdsale, { start });
      await approveMintage(token, crowdsale);
      await crowdsale.scheduleCrowdsaleEnd(
        availableAmount,
        start + DAY_IN_SECONDS,
        {
          from: owner
        }
      );

      await assertReverts(async () => {
        await scheduleStage(crowdsale, {
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
      await approveMintage(token, crowdsale);
      await scheduleStage(crowdsale);

      const tx = await crowdsale.scheduleCrowdsaleEnd(availableAmount, end, {
        from: owner
      });

      const log = findLastLog(tx, 'CrowdsaleEndScheduled');
      assert.isOk(log);

      const event = log.args as CrowdsaleEndScheduledEvent;
      assert.isOk(event);
      assertNumberEqual(event.end, end);
      assertNumberEqual(event.availableAmount, availableAmount);
    });

    it('should set crowdsale end', async () => {
      await approveMintage(token, crowdsale);
      await scheduleStage(crowdsale);

      await crowdsale.scheduleCrowdsaleEnd(availableAmount, end, {
        from: owner
      });

      assertNumberEqual(await crowdsale.end(), end);
    });

    it('should set available amount', async () => {
      await approveMintage(token, crowdsale);
      await scheduleStage(crowdsale);
      await crowdsale.scheduleCrowdsaleEnd(availableAmount, end, {
        from: owner
      });
      assertTokenEqual(await crowdsale.availableAmount(), availableAmount);
    });

    it('should mint tokens', async () => {
      const totalSupplyBefore = await token.totalSupply();
      await approveMintage(token, crowdsale);
      await schedule(crowdsale);
      const totalSupplyAfter = await token.totalSupply();

      assertNumberEqual(
        totalSupplyBefore.add(availableAmount),
        totalSupplyAfter
      );
    });

    it('should transfer minted tokens to crowdsale', async () => {
      await approveMintage(token, crowdsale);
      await schedule(crowdsale);

      assertNumberEqual(
        availableAmount,
        await token.balanceOf(crowdsale.address)
      );
    });

    it('should revert for not owner', async () => {
      await approveMintage(token, crowdsale);
      await scheduleStage(crowdsale);

      await assertReverts(async () => {
        await crowdsale.scheduleCrowdsaleEnd(availableAmount, end, {
          from: nonOwner
        });
      });
    });

    it('should revert for zero end', async () => {
      await approveMintage(token, crowdsale);
      await scheduleStage(crowdsale);

      await assertReverts(async () => {
        await crowdsale.scheduleCrowdsaleEnd(availableAmount, 0, {
          from: owner
        });
      });
    });

    it('should revert for zero availableAmount', async () => {
      await approveMintage(token, crowdsale);
      await scheduleStage(crowdsale);

      await assertReverts(async () => {
        await crowdsale.scheduleCrowdsaleEnd(0, end, { from: owner });
      });
    });

    it('should revert when no stages are scheduled', async () => {
      await approveMintage(token, crowdsale);
      await assertReverts(async () => {
        await crowdsale.scheduleCrowdsaleEnd(availableAmount, end, {
          from: owner
        });
      });
    });

    it('should revert if not mintage approved', async () => {
      await scheduleStage(crowdsale);
      await assertReverts(async () => {
        await crowdsale.scheduleCrowdsaleEnd(availableAmount, end, {
          from: owner
        });
      });
    });

    it('should revert if minted', async () => {
      await approveMintage(token, crowdsale);
      await scheduleStage(crowdsale);
      await crowdsale.scheduleCrowdsaleEnd(availableAmount, end, {
        from: owner
      });
      assertTokenEqual(await crowdsale.availableAmount(), availableAmount);
      await assertReverts(async () => {
        await crowdsale.scheduleCrowdsaleEnd(availableAmount, end, {
          from: owner
        });
      });
    });
  });

  describe('#getActualPrice', () => {
    let crowdsale: IcoCrowdsale;

    beforeEach(async () => {
      crowdsale = await createCrowdsale();
      await approveMintage(token, crowdsale);
    });

    it('should return zero when end not scheduled', async () => {
      assert.isFalse(await crowdsale.isCrowdsaleEndScheduled());
      const actualPrice = await crowdsale.getActualPrice();

      assert.equal(actualPrice.toNumber(), 0);
    });

    it('should return zero when inactive', async () => {
      const start = getUnixNow() + DAY_IN_SECONDS;
      const end = start + DAY_IN_SECONDS;
      await scheduleStage(crowdsale, { start });
      await crowdsale.scheduleCrowdsaleEnd(availableAmount, end, {
        from: owner
      });
      assert.isTrue(await crowdsale.isCrowdsaleEndScheduled());
      assert.isFalse(await crowdsale.isActive());

      const actualPrice = await crowdsale.getActualPrice();

      assert.equal(actualPrice.toNumber(), 0);
    });

    it('should return correct when active', async () => {
      const start = getUnixNow() - DAY_IN_SECONDS;
      const end = start + DAY_IN_SECONDS;
      await scheduleStage(crowdsale, { start, price: defaultPrice });
      await crowdsale.scheduleCrowdsaleEnd(availableAmount, end, {
        from: owner
      });
      assert.isTrue(await crowdsale.isCrowdsaleEndScheduled());
      assert.isTrue(await crowdsale.isActive());

      const actualPrice = await crowdsale.getActualPrice();

      assert.equal(actualPrice.toNumber(), defaultPrice.toNumber());
    });
  });

  describe('#calculateContribution', async () => {
    let crowdsale: IcoCrowdsale;

    beforeEach(async () => {
      crowdsale = await createCrowdsale();
      await approveMintage(token, crowdsale);
    });

    it('should correct calculate', async () => {
      await schedule(crowdsale, {
        end: getUnixNow() + 2 * DAY_IN_SECONDS,
        stages: [{ start: getUnixNow() - DAY_IN_SECONDS, price: defaultPrice }]
      });

      const calculatedContrubution = await crowdsale.calculateContribution(
        minValue
      );
      assert.equal(
        calculatedContrubution.round(10).toNumber(),
        calculateContribution(minValue, defaultPrice)
      );
    });

    it('should return zero if actual price is zero', async () => {
      await schedule(crowdsale, {
        end: getUnixNow() + 2 * DAY_IN_SECONDS,
        stages: [{ start: getUnixNow() + DAY_IN_SECONDS, price: defaultPrice }]
      });

      assertNumberEqual(
        await crowdsale.calculateContribution(defaultPrice),
        new BigNumber(0)
      );
    });
  });

  context('Given deployed token contract and tokens minted', () => {
    let crowdsale: IcoCrowdsale;

    beforeEach(async () => {
      crowdsale = await createCrowdsale();
      await token.approveMintingManager(crowdsale.address, { from: owner });
      await token.approveTransferManager(crowdsale.address, { from: owner });
    });

    it('should set amount of tokens available', async () => {
      assertTokenEqual(await crowdsale.availableAmount(), 0);

      await schedule(crowdsale);

      assertTokenEqual(await crowdsale.availableAmount(), availableAmount);
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
        const stages = createStagesOrDefault({ start });
        await schedule(crowdsale, { stages, end });

        assert.isTrue(await crowdsale.isCrowdsaleEndScheduled());
        assert.isFalse(await crowdsale.isActive());

        await assertReverts(async () => {
          await contribute(contributor, minValue);
        });
      });

      context('Given sale is active', () => {
        let stages: ScheduleStageOptions[];

        beforeEach(async () => {
          const start = getUnixNow() - 3600;
          const end = start + 7 * DAY_IN_SECONDS;
          const stagesCount = 3;
          stages = createStagesOrDefault({ start, count: stagesCount });
          await schedule(crowdsale, { stages, end });

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

      context('Stages changes', async () => {
        const acceptableError = toONL(shiftNumber(1, -9));
        const stageInterval = DAY_IN_SECONDS;

        async function setup() {
          const start = getUnixNow() - 3600;
          const end = start + 7 * DAY_IN_SECONDS;
          const stagesCount = 3;
          const stages = createStagesOrDefault({
            count: stagesCount,
            interval: stageInterval,
            start
          });
          await schedule(crowdsale, { stages, end });

          assert.isTrue(await crowdsale.isCrowdsaleEndScheduled());
          assert.isTrue(await crowdsale.isActive());
          return stages;
        }

        type StageContributionFunction = (
          stage: ScheduleStageOptions,
          value: Web3.AnyNumber
        ) => Promise<void>;

        async function testContributeForAllStages(
          testFunction: StageContributionFunction
        ) {
          const stages = await setup();
          const waitUntilNextStage = tempo(web3).wait;

          for (const stage of stages) {
            const contributionAmounts = [0.1, 0.5, 1];
            for (const eth of contributionAmounts) {
              await testFunction(stage, eth);
            }

            await waitUntilNextStage(stageInterval);
            networkTimeshift += stageInterval;
          }
        }

        it('should assign ONL to contributor in all stages', async () => {
          await testContributeForAllStages(
            async (stage: ScheduleStageOptions, eth: Web3.AnyNumber) => {
              const prevBalance = await token.balanceOf(contributor);
              const expectedAmount = toONL(
                calculateContribution(eth, stage.price)
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

        it(`should emit ContributionAccepted in all stages`, async () => {
          await testContributeForAllStages(
            async (stage: ScheduleStageOptions, eth: Web3.AnyNumber) => {
              const value = toWei(eth);
              const expectedAmount = toONL(
                calculateContribution(eth, stage.price)
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
          stages: createStagesOrDefault({ start })
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
            stages: createStagesOrDefault({ start })
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

    describe('#burnLeftTokens', () => {
      it('should revert if not owner', async () => {
        await assertReverts(async () => {
          await crowdsale.burnLeftTokens({ from: nonOwner });
        });
      });

      it('should revert if crowdsale is not scheduled', async () => {
        await assertReverts(async () => {
          await crowdsale.burnLeftTokens({ from: owner });
        });
      });

      it('should revert if crowdsale is active', async () => {
        const start = getUnixNow() - 3600;
        const end = start + 7 * DAY_IN_SECONDS;
        await schedule(crowdsale, {
          end,
          stages: createStagesOrDefault({ start })
        });

        assert.isTrue(await crowdsale.isCrowdsaleEndScheduled());
        assert.isTrue(await crowdsale.isActive());

        await assertReverts(async () => {
          await crowdsale.burnLeftTokens({ from: owner });
        });
      });

      context('Given sale is ended', () => {
        const waitUntilEnd = tempo(web3).wait;

        beforeEach(async () => {
          const start = getUnixNow() - 3600;
          const crowdaleDuration = 7 * DAY_IN_SECONDS;
          const end = start + crowdaleDuration;
          await schedule(crowdsale, {
            end,
            stages: createStagesOrDefault({ start })
          });

          assert.isTrue(await crowdsale.isCrowdsaleEndScheduled());
          assertNumberEqual(
            await token.balanceOf(crowdsale.address),
            availableAmount
          );
          assert.isTrue(await crowdsale.isActive());

          await waitUntilEnd(crowdaleDuration);
          networkTimeshift += crowdaleDuration;

          assert.isFalse(await crowdsale.isActive());
        });

        it('should set available amount to zero', async () => {
          await crowdsale.burnLeftTokens({ from: owner });

          assertNumberEqual(await crowdsale.availableAmount(), 0);
        });

        it('should set contract token balance to zero', async () => {
          await crowdsale.burnLeftTokens({ from: owner });

          assertNumberEqual(await token.balanceOf(crowdsale.address), 0);
        });

        it('should emit LeftTokensBurned event', async () => {
          const tx = await crowdsale.burnLeftTokens({ from: owner });

          const log = findLastLog(tx, 'LeftTokensBurned');
          assert.isOk(log);

          const event = log.args as LeftTokensBurnedEvent;
          assert.isOk(event);
        });
      });
    });
  });

  after(async () => {
    await sendRpc('evm_revert', [snapshotId]);
  });

  function createStagesOrDefault(options?: any) {
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
    const stagesCount = propOr(defaultStagesCount, 'count', options);
    const stageInterval = new BigNumber(propOr(
      DAY_IN_SECONDS,
      'interval',
      options
    ) as Web3.AnyNumber);

    const stages = [];
    for (let i = 0; i < stagesCount; i++) {
      stages.push({
        from: propOr(owner, 'owner', options),
        price: price.add(toWei(0.0001).mul(i)),
        start: start.add(stageInterval.mul(i))
      } as ScheduleStageOptions);
    }

    return stages;
  }

  function createEnd(start: Web3.AnyNumber) {
    return new BigNumber(start).add(7 * DAY_IN_SECONDS);
  }

  async function createCrowdsale(options?: Partial<CrowdsaleOptions>) {
    return await IcoCrowdsaleContract.new(
      propOr(wallet, 'wallet', options),
      propOr(token.address, 'token', options),
      propOr(minValue, 'minValue', options),
      { from: propOr(owner, 'from', options) }
    );
  }

  async function approveMintage(
    mintableToken: MintableToken,
    crowdsale: IcoCrowdsale
  ) {
    await mintableToken.approveMintingManager(crowdsale.address, {
      from: owner
    });
  }

  async function scheduleStage(
    crowdsale: IcoCrowdsale,
    options?: Partial<ScheduleStageOptions>
  ) {
    return await crowdsale.scheduleStage(
      propOr(getUnixNow(), 'start', options),
      propOr(defaultPrice, 'price', options),
      { from: propOr(owner, 'from', options) }
    );
  }

  async function schedule(
    crowdsale: IcoCrowdsale,
    options?: Partial<ScheduleEndOptions>
  ) {
    const stages: ScheduleStageOptions[] = propOr(
      createStagesOrDefault(getUnixNow()),
      'stages',
      options
    );
    await stages.forEach(async stage => {
      await scheduleStage(crowdsale, stage);
    });
    await crowdsale.scheduleCrowdsaleEnd(
      propOr(availableAmount, 'availableAmount', options),
      propOr(createEnd(stages[0].start), 'end', options),
      { from: owner }
    );
  }

  function getUnixNow() {
    return Math.round(new Date().getTime() / 1000) + networkTimeshift;
  }
});

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

interface ScheduleEndOptions {
  stages: ScheduleStageOptions[];
  end: Web3.AnyNumber;
}

interface ScheduleStageOptions {
  start: Web3.AnyNumber;
  price: Web3.AnyNumber;
  from?: Address;
}
