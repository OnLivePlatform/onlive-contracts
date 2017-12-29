import { BigNumber } from 'bignumber.js';
import { AnyNumber } from 'web3';

export function shiftNumber(num: AnyNumber, decimals: number): BigNumber {
  const factor = new BigNumber(10).pow(decimals);
  return new BigNumber(num).mul(factor);
}
