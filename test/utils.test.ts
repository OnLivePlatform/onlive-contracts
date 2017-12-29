import { BigNumber } from 'bignumber.js';
import { assert } from 'chai';

import {
  daysToBlocks,
  hoursToBlocks,
  minutesToBlocks,
  secondsToBlocks,
  shiftNumber,
  toMillionsONL,
  toONL,
  toThousandsONL
} from '../utils';
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

describe('#secondsToBlocks', () => {
  const suite = [
    { seconds: 0, blocks: 0 },
    { seconds: 5, blocks: 1 },
    { seconds: 15, blocks: 1 },
    { seconds: 16, blocks: 2 },
    { seconds: 30, blocks: 2 },
    { seconds: 100, blocks: 7 },
    { seconds: 1000, blocks: 67 }
  ];

  for (const { seconds, blocks } of suite) {
    it(`should return ${blocks} blocks for ${seconds} seconds`, () => {
      assert.equal(secondsToBlocks(seconds), blocks);
    });
  }
});

describe('#minutesToBlocks', () => {
  const suite = [
    { minutes: 0, blocks: 0 },
    { minutes: 5, blocks: 20 },
    { minutes: 15.5, blocks: 62 },
    { minutes: 30.1, blocks: 121 }
  ];

  for (const { minutes, blocks } of suite) {
    it(`should return ${blocks} blocks for ${minutes} minutes`, () => {
      assert.equal(minutesToBlocks(minutes), blocks);
    });
  }
});

describe('#hoursToBlocks', () => {
  const suite = [
    { hours: 0, blocks: 0 },
    { hours: 5, blocks: 1200 },
    { hours: 7.32, blocks: 1757 }
  ];

  for (const { hours, blocks } of suite) {
    it(`should return ${blocks} blocks for ${hours} hours`, () => {
      assert.equal(hoursToBlocks(hours), blocks);
    });
  }
});

describe('#daysToBlocks', () => {
  const suite = [
    { days: 0, blocks: 0 },
    { days: 2, blocks: 11520 },
    { days: 3.62, blocks: 20852 }
  ];

  for (const { days, blocks } of suite) {
    it(`should return ${blocks} blocks for ${days} days`, () => {
      assert.equal(daysToBlocks(days), blocks);
    });
  }
});
