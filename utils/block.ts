import { isNumber } from 'util';

export const blockTimes: { [network: string]: number } = {
  develop: 14.5,
  kovan: 4,
  mainnet: 14.5,
  rinkeby: 15,
  test: 15,
  testrpc: 14.5
};

export class BlockCalculator {
  constructor(private blockTime: number) {
    if (!isNumber(blockTime)) {
      throw new Error('Invalid block time');
    }
  }

  public secondsToBlocks(seconds: number): number {
    return Math.ceil(seconds / this.blockTime);
  }

  public minutesToBlocks(minutes: number): number {
    return this.secondsToBlocks(minutes * 60);
  }

  public hoursToBlocks(hours: number): number {
    return this.minutesToBlocks(hours * 60);
  }

  public daysToBlocks(days: number): number {
    return this.hoursToBlocks(days * 24);
  }
}
