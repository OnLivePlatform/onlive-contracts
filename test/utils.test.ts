import { BigNumber } from 'bignumber.js';

import { shiftNumber, toMillionsONL, toONL, toThousandsONL } from '../utils';
import { assertNumberEqual, assertTokenEqual } from './helpers';

describe('#shiftNumber', () => {
  it('should return the number if decimals is 0', () => {
    const num = 10;
    assertNumberEqual(shiftNumber(num, 0), num);
  });

  it('should multiple the number by 1000 if decimals is 3', () => {
    const num = 10;
    const expectedMul = 1000;
    assertNumberEqual(shiftNumber(num, 3), num * expectedMul);
  });

  it('should divide the number by 100 if decimals is -2', () => {
    const num = 10000;
    const expectedDiv = 100;
    assertNumberEqual(shiftNumber(num, -2), num / expectedDiv);
  });
});

describe('#toONL', () => {
  it('should return 0 for 0 input', () => {
    assertTokenEqual(toONL(0), 0);
  });

  it('should return 10¹⁸ for 1 input', () => {
    assertTokenEqual(toONL(1), new BigNumber(10).pow(18));
  });

  it('should return 10²⁰ for 100 input', () => {
    assertTokenEqual(toONL(100), new BigNumber(10).pow(20));
  });

  it('should return 10¹⁶ for 0.01 input', () => {
    assertTokenEqual(toONL(0.01), new BigNumber(10).pow(16));
  });
});

describe('#toThousandsONL', () => {
  it('should return 0 for 0 input', () => {
    assertTokenEqual(toThousandsONL(0), 0);
  });

  it('should return 10²¹ for 1 input', () => {
    assertTokenEqual(toThousandsONL(1), new BigNumber(10).pow(21));
  });

  it('should return 10²³ for 100 input', () => {
    assertTokenEqual(toThousandsONL(100), new BigNumber(10).pow(23));
  });

  it('should return 10¹⁹ for 0.01 input', () => {
    assertTokenEqual(toThousandsONL(0.01), new BigNumber(10).pow(19));
  });
});

describe('#toMillionsONL', () => {
  it('should return 0 for 0 input', () => {
    assertTokenEqual(toMillionsONL(0), 0);
  });

  it('should return 10²⁴ for 1 input', () => {
    assertTokenEqual(toMillionsONL(1), new BigNumber(10).pow(24));
  });

  it('should return 10²⁶ for 100 input', () => {
    assertTokenEqual(toMillionsONL(100), new BigNumber(10).pow(26));
  });

  it('should return 10²² for 0.01 input', () => {
    assertTokenEqual(toMillionsONL(0.01), new BigNumber(10).pow(22));
  });
});
