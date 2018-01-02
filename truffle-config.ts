import { fromGwei } from './utils';

export = {
  networks: {
    mainnet: {
      gasPrice: fromGwei(20),
      host: 'localhost',
      network_id: '1',
      port: 8545
    },
    rinkeby: {
      gasPrice: fromGwei(20),
      host: 'localhost',
      network_id: '4',
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
