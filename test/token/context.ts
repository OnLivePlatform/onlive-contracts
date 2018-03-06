import { ERC20Basic } from 'onlive';

export class TokenTestContext<T extends ERC20Basic> {
  get token(): T {
    if (this._token === undefined) {
      throw new Error('Token not initialized in context');
    }
    return this._token;
  }

  set token(value: T) {
    this._token = value;
  }

  private _token?: T;

  public constructor(public accounts: Address[], public owner: Address) {}
}
