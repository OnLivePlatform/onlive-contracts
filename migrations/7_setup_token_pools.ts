import { OnLiveArtifacts } from 'onlive';
import { Deployer } from 'truffle';
import { toMillionsONL } from '../utils';

declare const artifacts: OnLiveArtifacts;

const OnLiveToken = artifacts.require('./OnLiveToken.sol');
const TokenPool = artifacts.require('./TokenPool.sol');

async function deploy() {
  const pool = await TokenPool.deployed();
  const token = await OnLiveToken.deployed();

  await token.approveMintingManager(pool.address);
  await token.approveTransferManager(pool.address);

  await pool.registerPool('bounty', toMillionsONL(12.21), 0);
  await pool.registerPool('reserve', toMillionsONL(12.21), 0);
  await pool.registerPool('founders', toMillionsONL(6.66), 0);
  await pool.registerPool('advisors', toMillionsONL(5.55), 0);
  await pool.registerPool('legal', toMillionsONL(1.11), 0);
}

function migrate(deployer: Deployer) {
  deployer.then(() => deploy());
}

export = migrate;
