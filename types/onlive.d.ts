declare module 'onlive' {
  import { BigNumber } from 'bignumber.js';
  import {
    AnyContract,
    Contract,
    ContractBase,
    TransactionOptions,
    TransactionResult,
    TruffleArtifacts
  } from 'truffle';
  import { AnyNumber } from 'web3';

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

    interface Ownable extends ContractBase {
      owner(): Promise<Address>;

      transferOwnership(newOwner: Address): Promise<TransactionResult>;
    }

    interface ERC20Basic extends ContractBase {
      totalSupply(): Promise<BigNumber>;
      balanceOf(who: Address): Promise<BigNumber>;

      transfer(
        to: Address,
        amount: BigNumber,
        options?: TransactionOptions
      ): Promise<TransactionResult>;
    }

    interface TransferEvent {
      from: Address;
      to: Address;
      value: BigNumber;
    }

    interface ERC20 extends ERC20Basic {
      allowance(owner: Address, spender: Address): Promise<BigNumber>;

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

    interface ApprovalEvent {
      owner: Address;
      spender: Address;
      value: BigNumber;
    }

    interface ReleasableToken extends ERC20, Ownable {
      releaseManager(): Promise<Address>;
      transferManagers(addr: Address): Promise<boolean>;
      released(): Promise<boolean>;

      setReleaseManager(
        addr: Address,
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      approveTransferManager(
        addr: Address,
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      revokeTransferManager(
        addr: Address,
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      release(options?: TransactionOptions): Promise<TransactionResult>;
    }

    interface ReleaseManagerSetEvent {
      addr: Address;
    }

    interface TransferManagerApprovedEvent {
      addr: Address;
    }

    interface TransferManagerRevokedEvent {
      addr: Address;
    }

    type ReleasedEvent = {};

    interface MintableToken extends ERC20Basic, Ownable {
      mintingFinished(): Promise<boolean>;
      mintingManagers(addr: Address): Promise<boolean>;

      approveMintingManager(
        addr: Address,
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      revokeMintingManager(
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
      amount: BigNumber;
    }

    interface MintingManagerApprovedEvent {
      addr: Address;
    }

    interface MintingManagerRevokedEvent {
      addr: Address;
    }

    type MintingFinishedEvent = {};

    interface CappedMintableToken extends MintableToken {
      maxSupply(): Promise<BigNumber>;
    }

    interface BurnableToken extends ERC20Basic {
      burn(
        amount: AnyNumber,
        options?: TransactionOptions
      ): Promise<TransactionResult>;
    }

    interface BurnedEvent {
      from: Address;
      amount: BigNumber;
    }

    interface DescriptiveToken extends ERC20Basic, Ownable {
      name(): Promise<string>;
      symbol(): Promise<string>;
      decimals(): Promise<BigNumber>;
      isDescriptionFinalized(): Promise<boolean>;

      changeDescription(
        name: string,
        symbol: string,
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      finalizeDescription(
        options?: TransactionOptions
      ): Promise<TransactionResult>;
    }

    interface DescriptionChangedEvent {
      name: string;
      symbol: string;
    }

    type DescriptionFinalizedEvent = {};

    interface OnLiveToken
      extends DescriptiveToken,
        ReleasableToken,
        CappedMintableToken,
        BurnableToken {}

    interface ExternalCrowdsale extends ContractBase {
      token(): Promise<string>;
      startBlock(): Promise<BigNumber>;
      endBlock(): Promise<BigNumber>;
      availableAmount(): Promise<BigNumber>;
      isPaymentRegistered(paymentId: string): Promise<boolean>;
      isActive(): Promise<boolean>;

      scheduleSale(
        startBlock: AnyNumber,
        endBlock: AnyNumber,
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      registerPurchase(
        paymentId: string,
        purchaser: Address,
        amount: AnyNumber,
        options?: TransactionOptions
      ): Promise<TransactionResult>;
    }

    interface PurchaseRegisteredEvent {
      paymentId: string;
      purchaser: Address;
      amount: BigNumber;
    }

    interface SaleScheduledEvent {
      startBlock: BigNumber;
      endBlock: BigNumber;
    }

    interface MigrationsContract extends Contract<Migrations> {
      'new'(options?: TransactionOptions): Promise<Migrations>;
    }

    interface ReleasableTokenContract extends Contract<ReleasableToken> {
      'new'(options?: TransactionOptions): Promise<ReleasableToken>;
    }

    interface MintableTokenContract extends Contract<MintableToken> {
      'new'(options?: TransactionOptions): Promise<MintableToken>;
    }

    interface CappedMintableTokenContract
      extends Contract<CappedMintableToken> {
      'new'(
        maxSupply: AnyNumber,
        options?: TransactionOptions
      ): Promise<CappedMintableToken>;
    }

    interface BurnableTokenContract extends Contract<BurnableToken> {
      'new'(options?: TransactionOptions): Promise<BurnableToken>;
    }

    interface OnLiveTokenContract extends Contract<OnLiveToken> {
      'new'(
        name: string,
        symbol: string,
        maxSupply: AnyNumber,
        options?: TransactionOptions
      ): Promise<OnLiveToken>;
    }

    interface ExternalCrowdsaleContract extends Contract<ExternalCrowdsale> {
      'new'(
        token: Address,
        availableAmount: AnyNumber,
        options?: TransactionOptions
      ): Promise<ExternalCrowdsale>;
    }

    interface OnLiveArtifacts extends TruffleArtifacts {
      require(name: string): AnyContract;
      require(name: './Migrations.sol'): MigrationsContract;
      require(name: './token/ReleasableToken.sol'): ReleasableTokenContract;
      require(name: './token/MintableToken.sol'): MintableTokenContract;
      require(name: './token/BurnableToken.sol'): BurnableTokenContract;
      require(name: './OnLiveToken.sol'): OnLiveTokenContract;
      require(name: './ExternalCrowdsale.sol'): ExternalCrowdsaleContract;
    }
  }

  export = onlive;
}
