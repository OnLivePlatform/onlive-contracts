import * as Web3 from 'web3';

import { promisify } from './common';

export class Web3Utils {
  constructor(private web3: Web3) {}

  public async getBlockNumber() {
    return promisify<number>(cb => this.web3.eth.getBlockNumber(cb));
  }
}
