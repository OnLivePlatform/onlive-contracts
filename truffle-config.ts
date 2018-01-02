import { fromGwei } from './utils';

export = {
  networks: {
    mainnet: {
      from: '0x6c14a683e3e894fbEE5F929C5fAC402dF79694f6',
      gasPrice: fromGwei(21),
      host: 'localhost',
      network_id: '1',
      port: 8545
    },
    rinkeby: {
      from: '0x6c14a683e3e894fbEE5F929C5fAC402dF79694f6',
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
