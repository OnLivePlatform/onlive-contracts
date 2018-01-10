import { BigNumber } from 'bignumber.js';
import { AnyNumber } from 'web3';

export const ETH_DECIMALS = 18;

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
  return shiftNumber(eth, ETH_DECIMALS);
}

export function fromEth(eth: AnyNumber) {
  return shiftNumber(eth, ETH_DECIMALS);
}

export function fromFinney(finney: AnyNumber) {
  return shiftNumber(finney, 15);
}

export function fromSzabo(szabo: AnyNumber) {
  return shiftNumber(szabo, 12);
}

export function fromGwei(gwei: AnyNumber) {
  return shiftNumber(gwei, 9);
}

export function fromMwei(mwei: AnyNumber) {
  return shiftNumber(mwei, 6);
}

export function fromKwei(kwei: AnyNumber) {
  return shiftNumber(kwei, 3);
}

export function shiftNumber(num: AnyNumber, decimals: number): BigNumber {
  const factor = new BigNumber(10).pow(decimals);
  return new BigNumber(num).mul(factor);
}
