import { toGwei } from './utils';

export = {
  networks: {
    kovan: {
      gasPrice: toGwei(1),
      host: 'localhost',
      network_id: '42',
      port: 8545
    },
    mainnet: {
      gasPrice: toGwei(20),
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
