import { assert } from 'chai';

import * as Web3 from 'web3';

import {
  ExternalCrowdsale,
  MintableToken,
  OnLiveArtifacts,
  PurchaseRegisteredEvent
} from 'onlive';

import { ContractContextDefinition } from 'truffle';
import {
  assertThrowsInvalidOpcode,
  assertTokenEqual,
  findLastLog,
  toONL
} from './helpers';

declare const web3: Web3;
declare const artifacts: OnLiveArtifacts;
declare const contract: ContractContextDefinition;

const ExternalCrowdsaleContract = artifacts.require('./ExternalCrowdsale.sol');
const MintableTokenContract = artifacts.require('./token/MintableToken.sol');

contract('ExternalCrowdsale', accounts => {
  const owner = accounts[9];

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
    let crowdsale: ExternalCrowdsale;

    beforeEach(async () => {
      crowdsale = await ExternalCrowdsaleContract.new(
        token.address,
        toONL(1000),
        { from: owner }
      );

      await token.approveMintingManager(crowdsale.address, { from: owner });
    });

    describe('#registerPurchase', () => {
      const paymentId = '0x414243' + '0'.repeat(58);
      const purchaser = accounts[2];
      const amount = toONL(100);

      it('should reduce amount of available tokens', async () => {
        const availableAmount = await crowdsale.tokensAvailable();
        const expectedAmount = availableAmount.sub(amount);
        await crowdsale.registerPurchase(paymentId, purchaser, amount, {
          from: owner
        });
        assertTokenEqual(await crowdsale.tokensAvailable(), expectedAmount);
      });

      it('should mint tokens for purchaser', async () => {
        const balance = await token.balanceOf(purchaser);
        const expectedBalance = balance.add(amount);
        await crowdsale.registerPurchase(paymentId, purchaser, amount, {
          from: owner
        });
        assertTokenEqual(await token.balanceOf(purchaser), expectedBalance);
      });

      it('should mark payment id as registered', async () => {
        assert.isFalse(await crowdsale.isPaymentRegistered(paymentId));
        await crowdsale.registerPurchase(paymentId, purchaser, amount, {
          from: owner
        });
        assert.isTrue(await crowdsale.isPaymentRegistered(paymentId));
      });

      it('should emit PurchaseRegistered event', async () => {
        const tx = await crowdsale.registerPurchase(
          paymentId,
          purchaser,
          amount,
          { from: owner }
        );

        const log = findLastLog(tx, 'PurchaseRegistered');
        assert.isOk(log);

        const event = log.args as PurchaseRegisteredEvent;
        assert.isOk(event);
        assert.equal(event.paymentId, paymentId);
        assert.equal(event.purchaser, purchaser);
        assertTokenEqual(event.amount, amount);
      });
    });
  });
});
