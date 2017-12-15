import * as Web3 from 'web3';

import { BigNumber } from 'bignumber.js';

export class Web3Utils {
  constructor(private web3: Web3) {}

  public toEther(num: number | string) {
    return new BigNumber(this.web3.toWei(num, 'ether'));
  }
}
