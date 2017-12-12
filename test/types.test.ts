import { assert } from 'chai';

import * as Web3 from 'web3';

import { OnLiveArtifacts } from 'onlive';
import { ContractContextDefinition } from 'truffle';

declare const web3: Web3;
declare const artifacts: OnLiveArtifacts;
declare const contract: ContractContextDefinition;

contract('Test', accounts => {
  it('should work', () => {
    assert.isTrue(true);
  });
});
