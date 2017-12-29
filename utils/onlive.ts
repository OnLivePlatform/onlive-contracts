import { BigNumber } from 'bignumber.js';
import { AnyNumber } from 'web3';

export const ONL_DECIMALS = 18;

export function toONL(num: AnyNumber) {
  return shiftLeft(num, ONL_DECIMALS);
}

export function shiftLeft(num: AnyNumber, decimals: number) {
  return new BigNumber(num).mul(new BigNumber(10).pow(decimals));
}
