import { assert } from 'chai';
import { propOr } from 'ramda';

import * as Web3 from 'web3';

import {
  ContributionAcceptedEvent,
  Crowdsale,
  OnLiveArtifacts,
  OnLiveToken,
  SaleScheduledEvent
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
  findLastLog
} from './helpers';

declare const web3: Web3;
declare const artifacts: OnLiveArtifacts;
declare const contract: ContractContextDefinition;

const utils = new Web3Utils(web3);

const CrowdsaleContract = artifacts.require('./Crowdsale.sol');
const OnLiveTokenContract = artifacts.require('./OnLiveToken.sol');

contract('Crowdsale', accounts => {
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
    price: Web3.AnyNumber;
    availableAmount?: Web3.AnyNumber;
    minValue: Web3.AnyNumber;
    from: Address;
  }

  async function createCrowdsale(options?: Partial<CrowdsaleOptions>) {
    return await CrowdsaleContract.new(
      propOr(wallet, 'wallet', options),
      propOr(token.address, 'token', options),
      propOr(price, 'price', options),
      propOr(availableAmount, 'availableAmount', options),
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

    it('should revert when price is zero', async () => {
      await assertReverts(async () => {
        await createCrowdsale({ price: toWei(0) });
      });
    });

    it('should revert when available amount is zero', async () => {
      await assertReverts(async () => {
        await createCrowdsale({ availableAmount: toWei(0) });
      });
    });
  });

  context('Given deployed token contract', () => {
    const saleDuration = 1000;

    let crowdsale: Crowdsale;
    let startBlock: number;
    let endBlock: number;

    beforeEach(async () => {
      startBlock = await utils.getBlockNumber();
      endBlock = startBlock + saleDuration;

      crowdsale = await CrowdsaleContract.new(
        wallet,
        token.address,
        price,
        toONL(1000),
        minValue,
        {
          from: owner
        }
      );
      await token.approveMintingManager(crowdsale.address, { from: owner });
    });

    interface ScheduleOptions {
      startBlock: AnyNumber;
      endBlock: AnyNumber;
      from: Address;
    }

    async function scheduleSale(options?: Partial<ScheduleOptions>) {
      return await crowdsale.scheduleSale(
        propOr(startBlock, 'startBlock', options),
        propOr(endBlock, 'endBlock', options),
        { from: propOr(owner, 'from', options) }
      );
    }

    describe('#scheduleSale', () => {
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

      it('should revert when start block is zero', async () => {
        await assertReverts(async () => {
          await scheduleSale({ startBlock: new BigNumber(0) });
        });
      });

      it('should revert when end block is zero', async () => {
        await assertReverts(async () => {
          await scheduleSale({ endBlock: new BigNumber(0) });
        });
      });

      it('should revert when end block is equal start block', async () => {
        await assertReverts(async () => {
          await scheduleSale({ endBlock: startBlock });
        });
      });

      it('should revert when end block is lower than start block', async () => {
        await assertReverts(async () => {
          await scheduleSale({ endBlock: startBlock - 1 });
        });
      });

      it('should revert when called by non-owner', async () => {
        await assertReverts(async () => {
          await scheduleSale({ from: nonOwner });
        });
      });

      it('should revert when already scheduled', async () => {
        await scheduleSale();

        await assertReverts(async () => {
          await scheduleSale();
        });
      });
    });

    type ContributionFunction = (
      from: Address,
      value: Web3.AnyNumber
    ) => Promise<TransactionResult>;

    function testContribute(contribute: ContributionFunction) {
      it('should revert when sale is not scheduled', async () => {
        await assertReverts(async () => {
          await contribute(contributor, minValue);
        });
      });

      it('should revert when sale is not active', async () => {
        const futureStart = (await utils.getBlockNumber()) + 1000;
        await scheduleSale({
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
          await scheduleSale();

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
  });
});
