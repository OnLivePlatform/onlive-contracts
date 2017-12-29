import * as Web3 from 'web3';

import { BigNumber } from 'bignumber.js';
import { assert } from 'chai';
import { findLast, propEq } from 'ramda';
import { TransactionLog, TransactionResult } from 'truffle';

import { ONL_DECIMALS } from '../utils';

declare const web3: Web3;

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

export function assertTokenEqual(actual: any, expect: any) {
  return assertNumberEqual(actual, expect, ONL_DECIMALS);
}

export function findLastLog(
  trans: TransactionResult,
  event: string
): TransactionLog {
  return findLast(propEq('event', event))(trans.logs);
}
