/**
 * SUI Asset Provider Implementation
 */
import { ChainConfig } from '../../config';
import {
  IAsset,
  AssetMetadata,
  AssetBalance,
  AssetData,
  CreateCoinParams,
} from '../../interfaces/IAsset';
import { 
  getSuiProvider, 
  CoinManagerSingleton, 
  WalletManagerSingleton, 
  isValidTokenAddress, 
  isValidTokenAmount,
  SUI_DECIMALS
} from '@avernikoz/rinbot-sui-sdk';
import { getPriceApi } from '../../priceapi.utils';

/**
 * SUI Asset Provider Implementation
 */
export default class SuiAssetProvider implements IAsset {
  private config: ChainConfig;
  private provider: any;
  private coinManager: any;

  constructor(config: ChainConfig) {
    this.config = config;
    this.provider = getSuiProvider({ url: this.config.providerUrl });
  }

  /**
   * Initialize the coin manager
   */
  private async initCoinManager() {
    if (!this.coinManager) {
      // We need to import these dynamically to avoid circular dependencies
      const { getCoinManager } = await import('../../sui.functions');
      this.coinManager = await getCoinManager();
    }
    return this.coinManager;
  }

  /**
   * Get asset data by type/address
   */
  async getAssetByType(assetType: string): Promise<AssetData | null> {
    try {
      const coinManager = await this.initCoinManager();
      const coin = await coinManager.getCoinByType2(assetType);
      
      if (!coin) {
        return null;
      }
      
      // Get price data
      let price = null;
      try {
        const priceData = await getPriceApi('sui', assetType);
        price = priceData?.data.data.price || null;
      } catch (error) {
        console.error(`Failed to get price for ${assetType}:`, error);
      }
      
      return {
        name: coin.name || coin.symbol || '',
        symbol: coin.symbol || '',
        decimals: coin.decimals || 0,
        type: coin.type,
        address: coin.type,
        balance: '0', // This is just metadata, not a balance for a specific address
        price: price,
      };
    } catch (error) {
      console.error(`Failed to get asset by type ${assetType}:`, error);
      return null;
    }
  }

  /**
   * Get asset metadata
   */
  async getAssetMetadata(assetType: string): Promise<AssetMetadata | null> {
    try {
      const coinManager = await this.initCoinManager();
      const metadata = await coinManager.fetchCoinMetadata(assetType);
      
      if (!metadata) {
        return null;
      }
      
      return {
        name: metadata.name || '',
        symbol: metadata.symbol || '',
        decimals: metadata.decimals || 0,
        description: metadata.description || '',
        imageUrl: metadata.iconUrl || '',
        type: assetType,
        address: assetType,
      };
    } catch (error) {
      console.error(`Failed to get asset metadata for ${assetType}:`, error);
      return null;
    }
  }

  /**
   * Get asset balance for an address
   */
  async getAssetBalance(address: string, assetType: string): Promise<AssetBalance | null> {
    try {
      // Import dynamically to avoid circular dependencies
      const { getWalletManager } = await import('../../sui.functions');
      const walletManager = await getWalletManager();
      
      // Get all assets and find the one we want
      const allAssets = await walletManager.getAllCoinAssets(address);
      const asset = allAssets.find(a => a.type === assetType);
      
      if (!asset) {
        return null;
      }
      
      // Get price data
      let price = null;
      try {
        const priceData = await getPriceApi('sui', assetType);
        price = priceData?.data.data.price || null;
        
        return {
          balance: asset.balance,
          usdValue: price ? parseFloat(asset.balance) * price : undefined,
          price,
          priceChange1h: priceData?.data.data.priceChange1h,
          priceChange24h: priceData?.data.data.priceChange24h,
          marketCap: priceData?.data.data.mcap,
          timestamp: Date.now(),
        };
      } catch (error) {
        console.error(`Failed to get price for ${assetType}:`, error);
        
        return {
          balance: asset.balance,
        };
      }
    } catch (error) {
      console.error(`Failed to get asset balance for ${address}, ${assetType}:`, error);
      return null;
    }
  }

  /**
   * Get asset price in USD
   */
  async getAssetPrice(assetType: string): Promise<number | null> {
    try {
      const priceData = await getPriceApi('sui', assetType);
      return priceData?.data.data.price || null;
    } catch (error) {
      console.error(`Failed to get price for ${assetType}:`, error);
      return null;
    }
  }

  /**
   * Validate asset amount
   */
  isValidAssetAmount(params: {
    amount: string;
    maxAvailableAmount?: string;
    minAvailableAmount?: string;
    decimals: number;
  }): { isValid: boolean; reason?: string } {
    return isValidTokenAmount(params);
  }

  /**
   * Create a new coin/token
   */
  async createCoin(params: CreateCoinParams, privateKey: string): Promise<{
    success: boolean;
    assetType?: string;
    txHash?: string;
    error?: string;
  }> {
    try {
      const {
        name,
        symbol,
        decimals,
        description = '',
        imageUrl = '',
        totalSupply,
        fixedSupply,
        signerAddress,
      } = params;
      
      // Create the transaction
      const createCoinTx = await CoinManagerSingleton.getCreateCoinTransaction({
        name,
        symbol,
        decimals: decimals.toString(),
        fixedSupply,
        description,
        mintAmount: totalSupply,
        url: imageUrl || '',
        signerAddress,
      });
      
      // Execute the transaction
      const result = await this.provider.signAndExecuteTransactionBlock({
        transactionBlock: createCoinTx,
        signer: WalletManagerSingleton.getKeyPairFromPrivateKey(privateKey),
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });
      
      const success = result.effects?.status.status !== 'failure';
      
      if (!success) {
        return {
          success: false,
          txHash: result.digest,
          error: 'Transaction failed',
        };
      }
      
      // Extract the coin type from the transaction result
      // This is a simplified approach - in a real implementation, you'd need to parse the events
      // to find the exact coin type that was created
      const coinType = this.extractCoinTypeFromTransaction(result);
      
      return {
        success: true,
        assetType: coinType,
        txHash: result.digest,
      };
    } catch (error) {
      console.error('Create coin error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Extract coin type from transaction result
   * This is a simplified implementation - in a real scenario, you'd need to parse the events
   */
  private extractCoinTypeFromTransaction(txResult: any): string | undefined {
    try {
      // This is a placeholder - in a real implementation, you'd need to parse the events
      // to find the exact coin type that was created
      const events = txResult.events || [];
      const coinCreationEvent = events.find((event: any) => 
        event.type.includes('CoinCreated') || 
        event.type.includes('coin') || 
        event.type.includes('Coin')
      );
      
      if (coinCreationEvent && coinCreationEvent.parsedJson && coinCreationEvent.parsedJson.coinType) {
        return coinCreationEvent.parsedJson.coinType;
      }
      
      // Fallback: try to find it in object changes
      const objectChanges = txResult.objectChanges || [];
      const coinCreationObject = objectChanges.find((change: any) => 
        change.objectType && (change.objectType.includes('Coin') || change.objectType.includes('coin'))
      );
      
      if (coinCreationObject && coinCreationObject.objectType) {
        return coinCreationObject.objectType;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error extracting coin type from transaction:', error);
      return undefined;
    }
  }

  /**
   * Get the explorer link for an asset
   */
  getExplorerLink(assetType: string): string {
    return `${this.config.explorerUrl}/coin/${assetType}`;
  }

  /**
   * Check if an asset type is valid
   */
  isValidAssetType(assetType: string): boolean {
    return isValidTokenAddress(assetType);
  }

  /**
   * Get all assets for an address with prices
   */
  async getAllAssetsWithPrices(address: string): Promise<AssetData[]> {
    try {
      // Import dynamically to avoid circular dependencies
      const { refreshAssets } = await import('../../sui.functions');
      
      // Create a mock context with the address
      const mockContext = {
        session: { publicKey: address, assets: {} },
        from: { id: 0 },
      };
      
      // Use the existing refreshAssets function to get assets with prices
      const { allCoinsAssets } = await refreshAssets(mockContext as any);
      
      // Convert to the format expected by the interface
      return allCoinsAssets.map(asset => ({
        name: asset.name || asset.symbol || '',
        symbol: asset.symbol || '',
        decimals: asset.decimals || 0,
        type: asset.type,
        address: asset.type,
        balance: asset.balance,
        usdValue: asset.price ? parseFloat(asset.balance) * asset.price : undefined,
        price: asset.price,
        priceChange1h: asset.priceChange1h,
        priceChange24h: asset.priceChange24h,
        marketCap: asset.mcap,
        timestamp: asset.timestamp
      }));
    } catch (error) {
      console.error(`Failed to get all assets with prices for ${address}:`, error);
      return [];
    }
  }
}
