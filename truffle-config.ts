import { fromGwei } from './utils';

const gas = 3500000;
const gasPrice = fromGwei(31);
const host = 'localhost';
const port = 8545;

const defaults = {
  gas,
  gasPrice,
  host,
  port
};

export = {
  networks: {
    mainnet: {
      ...defaults,
      from: '0x6c14a683e3e894fbEE5F929C5fAC402dF79694f6',
      network_id: '1'
    },
    rinkeby: {
      ...defaults,
      from: '0x6c14a683e3e894fbEE5F929C5fAC402dF79694f6',
      network_id: '4'
    },
    testrpc: {
      gas,
      gasPrice: 0,
      host,
      network_id: '*',
      port
    }
  }
};
