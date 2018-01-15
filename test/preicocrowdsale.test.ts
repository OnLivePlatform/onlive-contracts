import { assert } from 'chai';
import { propOr } from 'ramda';

import * as Web3 from 'web3';

import {
  ContributionAcceptedEvent,
  ContributionRegisteredEvent,
  OnLiveArtifacts,
  OnLiveToken,
  PreIcoCrowdsale,
  ScheduledEvent
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

const PreIcoCrowdsaleContract = artifacts.require('./PreIcoCrowdsale.sol');
const OnLiveTokenContract = artifacts.require('./OnLiveToken.sol');

contract('PreIcoCrowdsale', accounts => {
  const owner = accounts[9];
  const nonOwner = accounts[8];
  const contributor = accounts[7];
  const wallet = accounts[6];
  const price = toWei(0.0011466);
  const availableAmount = toONL(1000);
  const minValue = toWei(0.1);

  let token: OnLiveToken;

  interface CrowdsaleOptions {
    wallet: Address;
    token: Address;
    availableAmount?: Web3.AnyNumber;
    price: Web3.AnyNumber;
    minValue: Web3.AnyNumber;
    from: Address;
  }

  async function createCrowdsale(options?: Partial<CrowdsaleOptions>) {
    return await PreIcoCrowdsaleContract.new(
      propOr(wallet, 'wallet', options),
      propOr(token.address, 'token', options),
      propOr(availableAmount, 'availableAmount', options),
      propOr(price, 'price', options),
      propOr(minValue, 'minValue', options),
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

    it('should set token price', async () => {
      const crowdsale = await createCrowdsale();
      assertTokenEqual(await crowdsale.price(), price);
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

    it('should revert when price is zero', async () => {
      await assertReverts(async () => {
        await createCrowdsale({ price: toWei(0) });
      });
    });
  });

  context('Given deployed token contract', () => {
    const saleDuration = 1000;

    let crowdsale: PreIcoCrowdsale;
    let startBlock: number;
    let endBlock: number;

    beforeEach(async () => {
      startBlock = await utils.getBlockNumber();
      endBlock = startBlock + saleDuration;

      crowdsale = await PreIcoCrowdsaleContract.new(
        wallet,
        token.address,
        toONL(1000),
        price,
        minValue,
        {
          from: owner
        }
      );
      await token.approveMintingManager(crowdsale.address, { from: owner });
    });

    describe('#setWallet', () => {
      const newWallet = accounts[5];

      it('should update wallet address', async () => {
        await crowdsale.setWallet(newWallet, { from: owner });
        assert.equal(await crowdsale.wallet(), newWallet);
      });

      it('should revert when called by non-owner', async () => {
        await assertReverts(async () => {
          await crowdsale.setWallet(newWallet, { from: nonOwner });
        });
      });

      it('should revert when contributor address is zero', async () => {
        await assertReverts(async () => {
          await crowdsale.setWallet(ZERO_ADDRESS, { from: owner });
        });
      });
    });

    interface ScheduleOptions {
      startBlock: AnyNumber;
      endBlock: AnyNumber;
      from: Address;
    }

    async function schedule(options?: Partial<ScheduleOptions>) {
      return await crowdsale.schedule(
        propOr(startBlock, 'startBlock', options),
        propOr(endBlock, 'endBlock', options),
        { from: propOr(owner, 'from', options) }
      );
    }

    describe('#schedule', () => {
      it('should set startBlock', async () => {
        await schedule();
        assertNumberEqual(await crowdsale.startBlock(), startBlock);
      });

      it('should set endBlock', async () => {
        await schedule();
        assertNumberEqual(await crowdsale.endBlock(), endBlock);
      });

      it('should emit SaleScheduled event', async () => {
        const tx = await schedule();

        const log = findLastLog(tx, 'Scheduled');
        assert.isOk(log);

        const event = log.args as ScheduledEvent;
        assert.isOk(event);
        assertNumberEqual(event.startBlock, startBlock);
        assertNumberEqual(event.endBlock, endBlock);
      });

      it('should revert when start block is zero', async () => {
        await assertReverts(async () => {
          await schedule({ startBlock: new BigNumber(0) });
        });
      });

      it('should revert when end block is zero', async () => {
        await assertReverts(async () => {
          await schedule({ endBlock: new BigNumber(0) });
        });
      });

      it('should revert when end block is equal start block', async () => {
        await assertReverts(async () => {
          await schedule({ endBlock: startBlock });
        });
      });

      it('should revert when end block is lower than start block', async () => {
        await assertReverts(async () => {
          await schedule({ endBlock: startBlock - 1 });
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
        const futureStart = (await utils.getBlockNumber()) + 1000;
        await schedule({
          endBlock: futureStart + saleDuration,
          startBlock: futureStart
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
          await contribute(contributor, minValue);

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
        amount: AnyNumber;
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
          endBlock: futureStart + saleDuration,
          startBlock: futureStart
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
