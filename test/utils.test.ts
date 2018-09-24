import { BigNumber } from 'bignumber.js';
import { assert } from 'chai';

import {
  BlockCalculator,
  calculateContribution,
  fromEth,
  fromFinney,
  fromGwei,
  fromKwei,
  fromMwei,
  fromSzabo,
  shiftNumber,
  toFinney,
  toGwei,
  toKwei,
  toMillionsONL,
  toMwei,
  toONL,
  toSzabo,
  toThousandsONL,
  toTimestamp,
  toWei
} from '../utils';
import {
  assertNumberEqual,
  assertTokenAlmostEqual,
  assertTokenEqual
} from './helpers';

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

const toConversionSpec = [
  { unit: 'Finney', func: toFinney, base: '1000' },
  { unit: 'Szabo', func: toSzabo, base: '1000000' },
  { unit: 'Gwei', func: toGwei, base: '1000000000' },
  { unit: 'Mwei', func: toMwei, base: '1000000000000' },
  { unit: 'Kwei', func: toKwei, base: '1000000000000000' },
  { unit: 'Wei', func: toWei, base: '1000000000000000000' }
];

for (const { unit, func, base } of toConversionSpec) {
  describe(`#to${unit}`, () => {
    it(`should return ${base} ${unit} for 1 ETH`, () => {
      assertNumberEqual(func(1), base);
    });

    const expectedMul = new BigNumber(base).times(5);
    it(`should return ${expectedMul} ${unit} for 5 ETH`, () => {
      assertNumberEqual(func(5), expectedMul);
    });

    const expectedDiv = new BigNumber(base).div(100);
    it(`should return ${expectedDiv} ${unit} for 0.01 ETH`, () => {
      assertNumberEqual(func(0.01), expectedDiv);
    });
  });
}

const fromConversionSpec = [
  { unit: 'ETH', func: fromEth, base: '1000000000000000000' },
  { unit: 'Finney', func: fromFinney, base: '1000000000000000' },
  { unit: 'Szabo', func: fromSzabo, base: '1000000000000' },
  { unit: 'Gwei', func: fromGwei, base: '1000000000' },
  { unit: 'Mwei', func: fromMwei, base: '1000000' },
  { unit: 'Kwei', func: fromKwei, base: '1000' }
];

for (const { unit, func, base } of fromConversionSpec) {
  describe(`#from${unit}`, () => {
    it(`should return ${base} Wei for 1 ${unit}`, () => {
      assertNumberEqual(func(1), base);
    });

    const expectedMul = new BigNumber(base).times(5);
    it(`should return ${expectedMul} Wei for 5 ${unit}`, () => {
      assertNumberEqual(func(5), expectedMul);
    });

    const expectedDiv = new BigNumber(base).div(100);
    it(`should return ${expectedDiv} Wei for 0.01 ${unit}`, () => {
      assertNumberEqual(func(0.01), expectedDiv);
    });
  });
}

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

describe('#calculateContribution', () => {
  const acceptableError = toONL(shiftNumber(1, -9));
  const suite = [
    {
      amounts: [
        { eth: 0.1, onl: 87.2143729287 },
        { eth: 1, onl: 872.143729287 },
        { eth: 50, onl: 43607.186464329 }
      ],
      price: 0.0011466
    },
    {
      amounts: [
        { eth: 0.1, onl: 76.3358778626 },
        { eth: 1, onl: 763.358778626 },
        { eth: 50, onl: 38167.938931297 }
      ],
      price: 0.00131
    },
    {
      amounts: [
        { eth: 0.1, onl: 68.5871056241 },
        { eth: 1, onl: 685.871056241 },
        { eth: 50, onl: 34293.552812071 }
      ],
      price: 0.001458
    },
    {
      amounts: [
        { eth: 0.1, onl: 61.0500610501 },
        { eth: 1, onl: 610.500610501 },
        { eth: 50, onl: 30525.03052503 }
      ],
      price: 0.001638
    }
  ];

  for (const { amounts, price } of suite) {
    context(`Given ONL price ${price} ETH`, () => {
      for (const { eth, onl } of amounts) {
        it(`should return ${onl} ONL for ${eth} ETH`, () => {
          assertTokenAlmostEqual(
            calculateContribution(toWei(eth), toONL(price)),
            toONL(onl),
            acceptableError
          );
        });
      }
    });
  }
});

describe('#secondsToBlocks', () => {
  const calculator = new BlockCalculator(15);
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
      assert.equal(calculator.secondsToBlocks(seconds), blocks);
    });
  }
});

describe('#minutesToBlocks', () => {
  const calculator = new BlockCalculator(15);
  const suite = [
    { minutes: 0, blocks: 0 },
    { minutes: 5, blocks: 20 },
    { minutes: 15.5, blocks: 62 },
    { minutes: 30.1, blocks: 121 }
  ];

  for (const { minutes, blocks } of suite) {
    it(`should return ${blocks} blocks for ${minutes} minutes`, () => {
      assert.equal(calculator.minutesToBlocks(minutes), blocks);
    });
  }
});

describe('#hoursToBlocks', () => {
  const calculator = new BlockCalculator(15);
  const suite = [
    { hours: 0, blocks: 0 },
    { hours: 5, blocks: 1200 },
    { hours: 7.32, blocks: 1757 }
  ];

  for (const { hours, blocks } of suite) {
    it(`should return ${blocks} blocks for ${hours} hours`, () => {
      assert.equal(calculator.hoursToBlocks(hours), blocks);
    });
  }
});

describe('#daysToBlocks', () => {
  const calculator = new BlockCalculator(15);
  const suite = [
    { days: 0, blocks: 0 },
    { days: 2, blocks: 11520 },
    { days: 3.62, blocks: 20852 }
  ];

  for (const { days, blocks } of suite) {
    it(`should return ${blocks} blocks for ${days} days`, () => {
      assert.equal(calculator.daysToBlocks(days), blocks);
    });
  }
});

describe('#toTimestamp', () => {
  const suite = [
    { date: '2012-01-02T20:21Z', timestamp: 1325535660 },
    { date: '2018-02-16T10:00Z', timestamp: 1518775200 },
    { date: '2042-10-15T15:21Z', timestamp: 2296999260 },
    { date: '1970-01-01T00:00Z', timestamp: 0 }
  ];

  for (const { date, timestamp } of suite) {
    it(`should return ${timestamp} for ${date}`, () => {
      assert.equal(toTimestamp(new Date(date)), timestamp);
    });
  }

  it(`should throw error for date before 1970`, () => {
    assert.throws(() => {
      toTimestamp(new Date('1969-12-01T10:00Z'));
    });
  });
});
