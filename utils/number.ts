import { BigNumber } from 'bignumber.js';
import { AnyNumber } from 'web3';

export function toFinney(eth: AnyNumber) {
  return shiftNumber(eth, 3);
}

export function toSzabo(eth: AnyNumber) {
  return shiftNumber(eth, 6);
}

export function toGwei(eth: AnyNumber) {
  return shiftNumber(eth, 9);
}

export function toMwei(eth: AnyNumber) {
  return shiftNumber(eth, 12);
}

export function toKwei(eth: AnyNumber) {
  return shiftNumber(eth, 15);
}

export function toWei(eth: AnyNumber) {
  return shiftNumber(eth, 18);
}

export function shiftNumber(num: AnyNumber, decimals: number): BigNumber {
  const factor = new BigNumber(10).pow(decimals);
  return new BigNumber(num).mul(factor);
}
