/**
 * IChainProvider interface defines the common methods that all chain providers must implement.
 * This is the main interface for interacting with different blockchains.
 */
import { IWallet } from './IWallet';
import { ITransaction } from './ITransaction';
import { IAsset } from './IAsset';
import { IPool } from './IPool';

export interface IChainProvider {
  /**
   * Get the chain ID
   */
  getChainId(): string;

  /**
   * Get the chain name
   */
  getChainName(): string;

  /**
   * Get the wallet interface for this chain
   */
  getWalletProvider(): IWallet;

  /**
   * Get the transaction interface for this chain
   */
  getTransactionProvider(): ITransaction;

  /**
   * Get the asset interface for this chain
   */
  getAssetProvider(): IAsset;

  /**
   * Get the pool interface for this chain
   */
  getPoolProvider(): IPool;

  /**
   * Initialize the chain provider with configuration
   */
  initialize(config: Record<string, any>): Promise<void>;

  /**
   * Check if the chain provider is initialized
   */
  isInitialized(): boolean;

  /**
   * Get the native token symbol for this chain
   */
  getNativeTokenSymbol(): string;

  /**
   * Get the native token decimals for this chain
   */
  getNativeTokenDecimals(): number;

  /**
   * Get the explorer URL for this chain
   */
  getExplorerUrl(type: 'tx' | 'address' | 'token', value: string): string;

  /**
   * Get the provider URL for this chain
   */
  getProviderUrl(): string;
}