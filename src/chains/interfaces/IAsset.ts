/**
 * IAsset interface defines the common methods for asset/token operations across different chains.
 */

export interface AssetMetadata {
  name: string;
  symbol: string;
  decimals: number;
  description?: string;
  imageUrl?: string;
  type: string; // The full type identifier for the asset
  address: string; // The contract address or identifier
}

export interface AssetBalance {
  balance: string;
  usdValue?: number;
  price?: number;
  priceChange1h?: number;
  priceChange24h?: number;
  marketCap?: number;
  timestamp?: number;
}

export interface AssetData extends AssetMetadata, AssetBalance {}

export interface CreateCoinParams {
  name: string;
  symbol: string;
  decimals: number;
  description?: string;
  imageUrl?: string;
  totalSupply: string;
  fixedSupply: boolean;
  signerAddress: string;
}

export interface IAsset {
  /**
   * Get asset data by type/address
   */
  getAssetByType(assetType: string): Promise<AssetData | null>;

  /**
   * Get asset metadata
   */
  getAssetMetadata(assetType: string): Promise<AssetMetadata | null>;

  /**
   * Get asset balance for an address
   */
  getAssetBalance(address: string, assetType: string): Promise<AssetBalance | null>;

  /**
   * Get asset price in USD
   */
  getAssetPrice(assetType: string): Promise<number | null>;

  /**
   * Validate asset amount
   */
  isValidAssetAmount(params: {
    amount: string;
    maxAvailableAmount?: string;
    minAvailableAmount?: string;
    decimals: number;
  }): { isValid: boolean; reason?: string };

  /**
   * Create a new coin/token
   */
  createCoin(params: CreateCoinParams, privateKey: string): Promise<{
    success: boolean;
    assetType?: string;
    txHash?: string;
    error?: string;
  }>;

  /**
   * Get the explorer link for an asset
   */
  getExplorerLink(assetType: string): string;

  /**
   * Check if an asset type is valid
   */
  isValidAssetType(assetType: string): boolean;

  /**
   * Get all assets for an address with prices
   */
  getAllAssetsWithPrices(address: string): Promise<AssetData[]>;
}