import { BigNumber } from 'bignumber.js';
import { AnyNumber } from 'web3';

import { ETH_DECIMALS, shiftNumber } from './number';

export const ONL_DECIMALS = 18;

export function toONL(num: AnyNumber) {
  return shiftNumber(num, ONL_DECIMALS);
}

export function toThousandsONL(num: AnyNumber) {
  const thousandDecimals = 3;
  return shiftNumber(num, thousandDecimals + ONL_DECIMALS);
}

export function toMillionsONL(num: AnyNumber) {
  const millionDecimals = 6;
  return shiftNumber(num, millionDecimals + ONL_DECIMALS);
}

export function calculateContribution(eth: AnyNumber, price: AnyNumber) {
  const value = new BigNumber(eth);
  return shiftNumber(value, ETH_DECIMALS).div(price);
}
