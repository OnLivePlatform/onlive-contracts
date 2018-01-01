import { fromGwei, shiftNumber } from './utils';

export = {
  networks: {
    kovan: {
      gas: shiftNumber(4.6, 6),
      gasPrice: fromGwei(1),
      host: 'localhost',
      network_id: '42',
      port: 8545
    },
    mainnet: {
      gasPrice: fromGwei(20),
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
