/**
 * SUI Chain Provider Implementation
 */
import { ChainConfig } from '../../config';
import { IChainProvider } from '../../interfaces/IChainProvider';
import { IWallet } from '../../interfaces/IWallet';
import { ITransaction } from '../../interfaces/ITransaction';
import { IAsset } from '../../interfaces/IAsset';
import { IPool } from '../../interfaces/IPool';

import SuiWalletProvider from './wallet';
import SuiTransactionProvider from './transaction';
import SuiAssetProvider from './asset';
import SuiPoolProvider from './pool';

/**
 * SUI Chain Provider Implementation
 */
export default class SuiChainProvider implements IChainProvider {
  private config: ChainConfig | null = null;
  private initialized = false;
  private walletProvider: SuiWalletProvider | null = null;
  private transactionProvider: SuiTransactionProvider | null = null;
  private assetProvider: SuiAssetProvider | null = null;
  private poolProvider: SuiPoolProvider | null = null;

  /**
   * Initialize the SUI chain provider
   */
  async initialize(config: Record<string, any>): Promise<void> {
    this.config = config as ChainConfig;
    
    // Initialize providers
    this.walletProvider = new SuiWalletProvider(this.config);
    this.transactionProvider = new SuiTransactionProvider(this.config);
    this.assetProvider = new SuiAssetProvider(this.config);
    this.poolProvider = new SuiPoolProvider(this.config);
    
    this.initialized = true;
  }

  /**
   * Check if the provider is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the chain ID
   */
  getChainId(): string {
    this.ensureInitialized();
    return this.config!.id;
  }

  /**
   * Get the chain name
   */
  getChainName(): string {
    this.ensureInitialized();
    return this.config!.name;
  }

  /**
   * Get the wallet provider
   */
  getWalletProvider(): IWallet {
    this.ensureInitialized();
    return this.walletProvider!;
  }

  /**
   * Get the transaction provider
   */
  getTransactionProvider(): ITransaction {
    this.ensureInitialized();
    return this.transactionProvider!;
  }

  /**
   * Get the asset provider
   */
  getAssetProvider(): IAsset {
    this.ensureInitialized();
    return this.assetProvider!;
  }

  /**
   * Get the pool provider
   */
  getPoolProvider(): IPool {
    this.ensureInitialized();
    return this.poolProvider!;
  }

  /**
   * Get the native token symbol
   */
  getNativeTokenSymbol(): string {
    this.ensureInitialized();
    return this.config!.nativeToken.symbol;
  }

  /**
   * Get the native token decimals
   */
  getNativeTokenDecimals(): number {
    this.ensureInitialized();
    return this.config!.nativeToken.decimals;
  }

  /**
   * Get the explorer URL
   */
  getExplorerUrl(type: 'tx' | 'address' | 'token', value: string): string {
    this.ensureInitialized();
    const baseUrl = this.config!.explorerUrl;
    
    switch (type) {
      case 'tx':
        return `${baseUrl}/tx/${value}`;
      case 'address':
        return `${baseUrl}/account/${value}`;
      case 'token':
        return `${baseUrl}/coin/${value}`;
      default:
        return baseUrl;
    }
  }

  /**
   * Get the provider URL
   */
  getProviderUrl(): string {
    this.ensureInitialized();
    return this.config!.providerUrl;
  }

  /**
   * Ensure the provider is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('SUI Chain Provider is not initialized');
    }
  }
}