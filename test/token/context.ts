import { ERC20Basic } from 'onlive';

export class TokenTestContext<T extends ERC20Basic> {
  public token: T;

  public constructor(public accounts: Address[], public owner: Address) {}
}
