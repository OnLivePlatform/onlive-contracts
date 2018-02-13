import * as Web3 from 'web3';

import { BigNumber } from 'bignumber.js';
import { assert } from 'chai';
import { findLast, propEq } from 'ramda';
import { TransactionLog, TransactionResult } from 'truffle';

import { ETH_DECIMALS, ONL_DECIMALS, toWei } from '../utils';

declare const web3: Web3;

export const ZERO_ADDRESS = '0x' + '0'.repeat(40);

export async function assertReverts(func: () => void) {
  try {
    await func();
  } catch (error) {
    assertRevertError(error);
    return;
  }
  assert.fail({}, {}, 'Should have reverted');
}

export function assertRevertError(error: { message: string }) {
  if (error && error.message) {
    if (error.message.search('revert') === -1) {
      assert.fail(
        error,
        {},
        'Expected revert error, instead got: ' + error.message
      );
    }
  } else {
    assert.fail(error, {}, 'Expected revert error');
  }
}

export function assertNumberEqual(
  actual: Web3.AnyNumber,
  expect: Web3.AnyNumber,
  decimals: number = 0
) {
  const actualNum = new BigNumber(actual);
  const expectNum = new BigNumber(expect);

  if (!actualNum.eq(expectNum)) {
    const div = decimals ? Math.pow(10, decimals) : 1;
    assert.fail(
      actualNum.toFixed(),
      expectNum.toFixed(),
      `${actualNum.div(div).toFixed()} == ${expectNum.div(div).toFixed()}`,
      '=='
    );
  }
}

export function assertNumberAlmostEqual(
  actual: Web3.AnyNumber,
  expect: Web3.AnyNumber,
  epsilon: Web3.AnyNumber,
  decimals: number = 0
) {
  const actualNum = new BigNumber(actual);
  const expectNum = new BigNumber(expect);
  const epsilonNum = new BigNumber(epsilon);

  if (
    actualNum.lessThan(expectNum.sub(epsilonNum)) ||
    actualNum.greaterThan(expectNum.add(epsilonNum))
  ) {
    const div = decimals ? Math.pow(10, decimals) : 1;
    assert.fail(
      actualNum.toFixed(),
      expectNum.toFixed(),
      `${actualNum.div(div).toFixed()} == ${expectNum
        .div(div)
        .toFixed()} (precision ${epsilonNum.div(div).toFixed()})`,
      '=='
    );
  }
}

export function assertEtherEqual(
  actual: Web3.AnyNumber,
  expect: Web3.AnyNumber
) {
  return assertNumberEqual(actual, expect, ETH_DECIMALS);
}

export function assertTokenEqual(
  actual: Web3.AnyNumber,
  expect: Web3.AnyNumber
) {
  return assertNumberEqual(actual, expect, ONL_DECIMALS);
}

export function assertTokenAlmostEqual(
  actual: Web3.AnyNumber,
  expect: Web3.AnyNumber,
  epsilon: Web3.AnyNumber
) {
  return assertNumberAlmostEqual(actual, expect, epsilon, ONL_DECIMALS);
}

export function findLastLog(
  trans: TransactionResult,
  event: string
): TransactionLog {
  return findLast(propEq('event', event))(trans.logs);
}

export function calculateContribution(
  amount: Web3.AnyNumber,
  price: Web3.AnyNumber
) {
  return toWei(amount)
    .div(price)
    .round(10)
    .toNumber();
}

export function sendRpc(method: any, params?: any) {
  return new Promise(resolve => {
    web3.currentProvider.sendAsync(
      {
        jsonrpc: '2.0',
        method: method,
        params: params || [],
        id: new Date().getTime()
      },
      (err, res) => {
        resolve(res);
      }
    );
  });
}
