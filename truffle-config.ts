import * as Web3 from 'web3';

import { Web3Utils } from './utils';

declare const web3: Web3;

const utils = new Web3Utils(web3);

export = {
  networks: {
    kovan: {
      gasPrice: utils.toGwei(1),
      host: 'localhost',
      network_id: '42',
      port: 8545
    },
    mainnet: {
      gasPrice: utils.toGwei(20),
      host: 'localhost',
      network_id: '1',
      port: 8545
    },
    testrpc: {
      gasPrice: 0,
      host: 'localhost',
      network_id: '*',
      port: 8545
    }
  }
};
