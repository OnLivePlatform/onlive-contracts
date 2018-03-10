import { fromGwei } from './utils';

const from = '0x6c14a683e3e894fbEE5F929C5fAC402dF79694f6';
const gas = 3500000;
const gasPrice = fromGwei(20);
const host = 'localhost';
const port = 8545;

const defaults = {
  from,
  gas,
  gasPrice,
  host,
  port
};

export = {
  networks: {
    kovan: {
      ...defaults,
      network_id: '42'
    },
    mainnet: {
      ...defaults,
      network_id: '1'
    },
    rinkeby: {
      ...defaults,
      network_id: '4'
    },
    testrpc: {
      ...defaults,
      from: undefined,
      network_id: '*'
    }
  }
};
