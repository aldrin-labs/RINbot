/**
 * Solana Chain Provider Implementation
 */
import { ChainConfig } from '../../config';
import { IChainProvider } from '../../interfaces/IChainProvider';
import { IWallet } from '../../interfaces/IWallet';
import { ITransaction } from '../../interfaces/ITransaction';
import { IAsset } from '../../interfaces/IAsset';
import { IPool } from '../../interfaces/IPool';

import SolanaWalletProvider from './wallet';
import SolanaTransactionProvider from './transaction';
import SolanaAssetProvider from './asset';
import SolanaPoolProvider from './pool';

/**
 * Solana Chain Provider Implementation
 * This is a placeholder implementation that shows "coming soon" messages
 */
export default class SolanaChainProvider implements IChainProvider {
  private config: ChainConfig | null = null;
  private initialized = false;
  private walletProvider: SolanaWalletProvider | null = null;
  private transactionProvider: SolanaTransactionProvider | null = null;
  private assetProvider: SolanaAssetProvider | null = null;
  private poolProvider: SolanaPoolProvider | null = null;

  /**
   * Initialize the Solana chain provider
   */
  async initialize(config: Record<string, any>): Promise<void> {
    this.config = config as ChainConfig;
    
    // Initialize providers
    this.walletProvider = new SolanaWalletProvider(this.config);
    this.transactionProvider = new SolanaTransactionProvider(this.config);
    this.assetProvider = new SolanaAssetProvider(this.config);
    this.poolProvider = new SolanaPoolProvider(this.config);
    
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
        return `${baseUrl}/address/${value}`;
      case 'token':
        return `${baseUrl}/token/${value}`;
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
      throw new Error('Solana Chain Provider is not initialized');
    }
  }
}