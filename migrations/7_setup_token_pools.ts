// tslint:disable:no-console

import { OnLiveArtifacts } from 'onlive';
import { Deployer } from 'truffle';
import { toONL, toTimestamp } from '../utils';

declare const artifacts: OnLiveArtifacts;

const OnLiveToken = artifacts.require('./OnLiveToken.sol');
const TokenPool = artifacts.require('./TokenPool.sol');

const grandTotal = 37_740_000;
const specification = [
  {
    category: 'reserve',
    pools: [
      {
        amount: 1_343_100,
        lock: null,
        tranche: 't1'
      },
      {
        amount: 3_540_900,
        lock: new Date('2019-04-11'),
        tranche: 't2'
      },
      {
        amount: 3_663_000,
        lock: new Date('2020-04-11'),
        tranche: 't3'
      },
      {
        amount: 3_663_000,
        lock: new Date('2021-04-11'),
        tranche: 't4'
      }
    ],
    total: 12_210_000
  },
  {
    category: 'founders',
    pools: [
      {
        amount: 1_343_100,
        lock: new Date('2020-04-11'),
        tranche: 't1'
      },
      {
        amount: 3_540_900,
        lock: new Date('2021-04-11'),
        tranche: 't2'
      },
      {
        amount: 3_663_000,
        lock: new Date('2022-04-11'),
        tranche: 't3'
      },
      {
        amount: 3_663_000,
        lock: new Date('2023-04-11'),
        tranche: 't4'
      }
    ],
    total: 12_210_000
  },
  {
    category: 'bounty',
    pools: [
      {
        amount: 2_664_000,
        lock: null,
        tranche: 't1'
      },
      {
        amount: 1_332_000,
        lock: new Date('2019-04-11'),
        tranche: 't2'
      },
      {
        amount: 1_332_000,
        lock: new Date('2020-04-11'),
        tranche: 't3'
      },
      {
        amount: 1_332_000,
        lock: new Date('2021-04-11'),
        tranche: 't4'
      }
    ],
    total: 6_660_000
  },
  {
    category: 'advisors',
    pools: [
      {
        amount: 610_500,
        lock: null,
        tranche: 't1'
      },
      {
        amount: 1_609_500,
        lock: new Date('2018-10-11'),
        tranche: 't2'
      },
      {
        amount: 1_665_000,
        lock: new Date('2019-04-11'),
        tranche: 't3'
      },
      {
        amount: 1_665_000,
        lock: new Date('2020-04-11'),
        tranche: 't4'
      }
    ],
    total: 5_550_000
  },
  {
    category: 'legal',
    pools: [
      {
        amount: 555_000,
        lock: null,
        tranche: 't1'
      },
      {
        amount: 555_000,
        lock: new Date('2018-10-11'),
        tranche: 't2'
      }
    ],
    total: 1_110_000
  }
];

async function deploy() {
  validateSubTotals();
  validateGrandTotal();

  const pool = await TokenPool.deployed();
  const token = await OnLiveToken.deployed();

  await token.approveMintingManager(pool.address);
  await token.approveTransferManager(pool.address);

  for (const { category, pools, total } of specification) {
    console.log('-'.repeat(70));
    console.log(`'${category}' ${total.toLocaleString()} ONL`);
    console.log('-'.repeat(70));

    for (const { amount, lock, tranche } of pools) {
      const id = `${category}-${tranche}`;

      console.log(
        `${id} ${amount.toLocaleString()} ONL`,
        lock ? `locked until ${lock.toISOString()}` : 'not locked'
      );

      await pool.registerPool(id, toONL(amount), lock ? toTimestamp(lock) : 0);
    }
  }
}

function validateSubTotals() {
  for (const { category, pools, total } of specification) {
    const calc = pools
      .map(pool => pool.amount)
      .reduce((aggregated, amount) => aggregated + amount, 0);

    if (calc !== total) {
      throw new Error(`Totals do not sum in category ${category}`);
    }
  }
}

function validateGrandTotal() {
  const calc = specification
    .map(category =>
      category.pools
        .map(pool => pool.amount)
        .reduce((aggregated, amount) => aggregated + amount, 0)
    )
    .reduce((total, category) => total + category, 0);

  if (calc !== grandTotal) {
    throw new Error('Totals do not sum to Grand Total');
  }
}

function migrate(deployer: Deployer) {
  deployer.then(() => deploy());
}

export = migrate;
