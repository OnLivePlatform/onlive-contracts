import { assert } from 'chai';
import { propOr } from 'ramda';

import * as Web3 from 'web3';

import {
  Crowdsale,
  OnLiveArtifacts,
  OnLiveToken,
  SaleScheduledEvent
} from 'onlive';
import { toONL, toWei, Web3Utils } from '../utils';

import { BigNumber } from 'bignumber.js';
import { ContractContextDefinition } from 'truffle';
import { AnyNumber } from 'web3';
import {
  assertNumberEqual,
  assertReverts,
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
  const wallet = accounts[7];
  const price = toWei(0.001638);
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

    const ethDecimals = 18;
    assertNumberEqual(await token.decimals(), ethDecimals);
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
  });
});
