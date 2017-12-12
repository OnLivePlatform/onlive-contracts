import { assert } from 'chai';

import * as Web3 from 'web3';

import { OnLiveArtifacts, ReleasableToken } from 'onlive';
import { ContractContextDefinition } from 'truffle';
import { assertThrowsInvalidOpcode } from '../helpers';

declare const web3: Web3;
declare const artifacts: OnLiveArtifacts;
declare const contract: ContractContextDefinition;

const ReleasableTokenContract = artifacts.require(
  './token/ReleasableToken.sol'
);

contract('ReleasableToken', accounts => {
  const owner = accounts[9];
  const account = accounts[1];

  let token: ReleasableToken;

  beforeEach(async () => {
    token = await ReleasableTokenContract.new({ from: owner });
  });

  describe('#setReleaseManager', () => {
    it('should set release manager', async () => {
      assert.notEqual(await token.releaseManager(), account);
      await token.setReleaseManager(account, { from: owner });
      assert.equal(await token.releaseManager(), account);
    });

    it('should throw invalid opcode when called by non-owner', async () => {
      await assertThrowsInvalidOpcode(async () => {
        await token.setReleaseManager(account);
      });
    });
  });
});
