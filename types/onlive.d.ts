declare module 'onlive' {
  import {
    AnyContract,
    Contract,
    ContractBase,
    TransactionOptions,
    TransactionResult,
    TruffleArtifacts
  } from 'truffle';

  namespace onlive {
    interface Migrations extends ContractBase {
      setCompleted(
        completed: number,
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      upgrade(
        address: Address,
        options?: TransactionOptions
      ): Promise<TransactionResult>;
    }

    interface ReleasableToken extends ContractBase {
      releaseManager(): Promise<Address>;

      setReleaseManager(
        addr: Address,
        options?: TransactionOptions
      ): Promise<TransactionResult>;
    }

    interface MigrationsContract extends Contract<Migrations> {
      'new'(options?: TransactionOptions): Promise<Migrations>;
    }

    interface ReleasableTokenContract extends Contract<ReleasableToken> {
      'new'(options?: TransactionOptions): Promise<ReleasableToken>;
    }

    interface OnLiveArtifacts extends TruffleArtifacts {
      require(name: string): AnyContract;
      require(name: './Migrations.sol'): MigrationsContract;
      require(name: './token/ReleasableToken.sol'): ReleasableTokenContract;
    }
  }

  export = onlive;
}
