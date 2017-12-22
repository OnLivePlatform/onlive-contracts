import * as Web3 from 'web3';

import { BigNumber } from 'bignumber.js';
import { assert } from 'chai';
import { findLast, propEq } from 'ramda';
import { TransactionLog, TransactionResult } from 'truffle';

declare const web3: Web3;

const ONL_DECIMALS = 18;

export function toONL(num: number | string) {
  // assumes that ONL has 18 decimals just like ETH
  return new BigNumber(web3.toWei(num, 'ether'));
}

export async function assertThrowsInvalidOpcode(func: () => void) {
  try {
    await func();
  } catch (error) {
    assertInvalidOpcode(error);
    return;
  }
  assert.fail({}, {}, 'Should have thrown Invalid Opcode');
}

export function assertInvalidOpcode(error: { message: string }) {
  if (error && error.message) {
    if (error.message.search('invalid opcode') === -1) {
      assert.fail(
        error,
        {},
        'Expected Invalid Opcode error, instead got: ' + error.message
      );
    }
  } else {
    assert.fail(error, {}, 'Expected Invalid Opcode error');
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
