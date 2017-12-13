import { ERC20 } from 'onlive';

export class TokenTestContext<T extends ERC20> {
  public token: T;

  public constructor(public accounts: Address[], public owner: Address) {}
}
