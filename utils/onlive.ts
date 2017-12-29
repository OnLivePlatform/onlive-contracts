import { BigNumber } from 'bignumber.js';
import { AnyNumber } from 'web3';

export const ONL_DECIMALS = 18;

export function toONL(num: AnyNumber) {
  return shiftNumber(num, ONL_DECIMALS);
}

export function shiftNumber(num: AnyNumber, decimals: number): BigNumber {
  const factor = new BigNumber(10).pow(decimals);
  return new BigNumber(num).mul(factor);
}
