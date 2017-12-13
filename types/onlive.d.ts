declare module 'onlive' {
  import {
    AnyContract,
    Contract,
    ContractBase,
    TransactionOptions,
    TransactionResult,
    TruffleArtifacts
  } from 'truffle';
  import { AnyNumber } from 'web3';
  import { BigNumber } from 'bignumber.js';

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

    interface ERC20 extends ContractBase {
      totalSupply(): Promise<BigNumber>;
      balanceOf(who: Address): Promise<BigNumber>;
      allowance(owner: Address, spender: Address): Promise<BigNumber>;

      transfer(
        to: Address,
        value: BigNumber,
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      transferFrom(
        from: Address,
        to: Address,
        value: AnyNumber,
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      approve(
        spender: Address,
        value: AnyNumber,
        options?: TransactionOptions
      ): Promise<TransactionResult>;
    }

    interface TransferEvent {
      from: Address;
      to: Address;
      value: BigNumber;
    }

    interface ReleasableToken extends ERC20 {
      releaseManager(): Promise<Address>;
      transferManagers(addr: Address): Promise<boolean>;
      isReleased(): Promise<boolean>;

      setReleaseManager(
        addr: Address,
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      addTransferManager(
        addr: Address,
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      removeTransferManager(
        addr: Address,
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      release(options?: TransactionOptions): Promise<TransactionResult>;
    }

    interface ReleaseManagerSetEvent {
      addr: Address;
    }

    interface TransferManagerAddedEvent {
      addr: Address;
    }

    interface TransferManagerRemovedEvent {
      addr: Address;
    }

    interface ReleasedEvent {}

    interface MintableToken extends ERC20 {
      isMintingFinished(): Promise<boolean>;
      mintingManagers(addr: Address): Promise<boolean>;

      addMintingManager(
        addr: Address,
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      removeMintingManager(
        addr: Address,
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      mint(
        to: Address,
        amount: AnyNumber,
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      finishMinting(options?: TransactionOptions): Promise<TransactionResult>;
    }

    interface MintedEvent {
      to: Address;
      value: BigNumber;
    }

    interface MintingManagerAddedEvent {
      addr: Address;
    }

    interface MintingManagerRemovedEvent {
      addr: Address;
    }

    interface MintingFinishedEvent {}

    interface MigrationsContract extends Contract<Migrations> {
      'new'(options?: TransactionOptions): Promise<Migrations>;
    }

    interface ReleasableTokenContract extends Contract<ReleasableToken> {
      'new'(options?: TransactionOptions): Promise<ReleasableToken>;
    }

    interface MintableTokenContract extends Contract<MintableToken> {
      'new'(options?: TransactionOptions): Promise<MintableToken>;
    }

    interface OnLiveArtifacts extends TruffleArtifacts {
      require(name: string): AnyContract;
      require(name: './Migrations.sol'): MigrationsContract;
      require(name: './token/ReleasableToken.sol'): ReleasableTokenContract;
      require(name: './token/MintableToken.sol'): MintableTokenContract;
    }
  }

  export = onlive;
}
