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
      isTransferManager(addr: Address): Promise<boolean>;
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
      isMintingManager(addr: Address): Promise<boolean>;

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

    interface Schedulable extends ContractBase {
      startBlock(): Promise<BigNumber>;
      endBlock(): Promise<BigNumber>;
      isActive(): Promise<boolean>;
      isScheduled(): Promise<boolean>;

      schedule(
        startBlock: AnyNumber,
        endBlock: AnyNumber,
        options?: TransactionOptions
      ): Promise<TransactionResult>;
    }

    interface ScheduledEvent {
      startBlock: BigNumber;
      endBlock: BigNumber;
    }

    interface PreIcoCrowdsale extends Schedulable {
      wallet(): Promise<string>;
      token(): Promise<string>;
      availableAmount(): Promise<BigNumber>;
      price(): Promise<BigNumber>;
      minValue(): Promise<BigNumber>;
      isContributionRegistered(id: string): Promise<boolean>;
      calculateContribution(value: AnyNumber): Promise<BigNumber>;

      contribute(
        contributor: Address,
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      registerContribution(
        id: string,
        contributor: Address,
        amount: AnyNumber,
        options?: TransactionOptions
      ): Promise<TransactionResult>;
    }

    interface ContributionAcceptedEvent {
      contributor: Address;
      value: BigNumber;
      amount: BigNumber;
    }

    interface ContributionRegisteredEvent {
      id: string;
      contributor: Address;
      amount: BigNumber;
    }

    interface TokenPool extends Ownable {
      token(): Promise<string>;

      registerPool(
        poolId: string,
        availableAmount: AnyNumber,
        lockTimestamp: AnyNumber,
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      transfer(
        poolId: string,
        to: Address,
        amount: AnyNumber,
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      getAvailableAmount(poolId: string): Promise<AnyNumber>;

      getLockTimestamp(poolId: string): Promise<AnyNumber>;
    }

    interface PoolLockedEvent {
      poolId: string;
      lockTimestamp: BigNumber;
    }

    interface PoolRegisteredEvent {
      poolId: string;
      amount: BigNumber;
    }

    interface PoolTransferredEvent {
      poolId: string;
      to: Address;
      amount: BigNumber;
    }

    interface IcoCrowdsale extends Ownable {
      wallet(): Promise<string>;
      token(): Promise<string>;
      availableAmount(): Promise<BigNumber>;
      minValue(): Promise<BigNumber>;
      stages(index: AnyNumber): Promise<BigNumber[]>;
      end(): Promise<BigNumber>;
      isContributionRegistered(id: string): Promise<boolean>;
      calculateContribution(value: AnyNumber): Promise<BigNumber>;
      isCrowdsaleEndScheduled(): Promise<boolean>;
      isActive(): Promise<boolean>;

      setAvailableAmount(
        amount: AnyNumber,
        options?: TransactionOptions
      ): Promise<void>;

      contribute(
        contributor: Address,
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      registerContribution(
        id: string,
        contributor: Address,
        amount: AnyNumber,
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      getActualPrice(): Promise<BigNumber>;

      scheduleStage(
        start: AnyNumber,
        price: AnyNumber,
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      scheduleCrowdsaleEnd(
        end: AnyNumber,
        options?: TransactionOptions
      ): Promise<TransactionResult>;
    }

    interface StageScheduledEvent {
      start: BigNumber;
      price: BigNumber;
    }

    interface CrowdsaleEndScheduledEvent {
      end: BigNumber;
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

    interface PreIcoCrowdsaleContract extends Contract<PreIcoCrowdsale> {
      'new'(
        wallet: Address,
        token: Address,
        availableAmount: AnyNumber,
        price: AnyNumber,
        minValue: AnyNumber,
        options?: TransactionOptions
      ): Promise<PreIcoCrowdsale>;
    }

    interface IcoCrowdsaleContract extends Contract<IcoCrowdsale> {
      'new'(
        wallet: Address,
        token: Address,
        minValue: AnyNumber,
        options?: TransactionOptions
      ): Promise<IcoCrowdsale>;
    }

    interface TokenPoolContract extends Contract<TokenPool> {
      'new'(token: Address, options?: TransactionOptions): Promise<TokenPool>;
    }

    interface OnLiveArtifacts extends TruffleArtifacts {
      require(name: string): AnyContract;
      require(name: './Migrations.sol'): MigrationsContract;
      require(name: './token/ReleasableToken.sol'): ReleasableTokenContract;
      require(name: './token/MintableToken.sol'): MintableTokenContract;
      require(name: './token/BurnableToken.sol'): BurnableTokenContract;
      require(name: './OnLiveToken.sol'): OnLiveTokenContract;
      require(name: './PreIcoCrowdsale.sol'): PreIcoCrowdsaleContract;
      require(name: './TokenPool.sol'): TokenPoolContract;
      require(name: './IcoCrowdsale.sol'): IcoCrowdsaleContract;
    }
  }

  export = onlive;
}
