/**
 * IPool interface defines the common methods for liquidity pool operations across different chains.
 */
import { AssetData } from './IAsset';

export interface PoolProvider {
  name: string;
  id: string;
}

export interface PoolData {
  id: string;
  name: string;
  provider: PoolProvider;
  coins: AssetData[];
  tvl?: string;
  volume24h?: string;
  apr?: string;
  fees?: string;
  feePercent?: number;
}

export interface CreatePoolParams {
  coinA: {
    type: string;
    amount: string;
    weight?: number;
  };
  coinB: {
    type: string;
    amount: string;
    weight?: number;
  };
  feePercent: number;
  poolName: string;
  lpCoinMetadata: {
    name: string;
    symbol: string;
  };
  signerAddress: string;
}

export interface SwapParams {
  fromAsset: string;
  toAsset: string;
  amount: string;
  slippagePercent: number;
  signerAddress: string;
}

export interface SwapQuote {
  fromAmount: string;
  toAmount: string;
  priceImpact: string;
  fee: string;
  route: PoolProvider[];
  minReceived: string;
}

export interface IPool {
  /**
   * Get all available pool providers
   */
  getPoolProviders(): PoolProvider[];

  /**
   * Get pools owned by an address
   */
  getOwnedPools(address: string): Promise<PoolData[]>;

  /**
   * Get pool by ID
   */
  getPoolById(poolId: string): Promise<PoolData | null>;

  /**
   * Create a new liquidity pool
   */
  createPool(params: CreatePoolParams, privateKey: string): Promise<{
    success: boolean;
    poolId?: string;
    txHash?: string;
    error?: string;
  }>;

  /**
   * Get swap quote
   */
  getSwapQuote(params: SwapParams): Promise<SwapQuote>;

  /**
   * Execute a swap
   */
  executeSwap(params: SwapParams, privateKey: string): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }>;

  /**
   * Get the explorer link for a pool
   */
  getPoolExplorerLink(poolId: string): string;

  /**
   * Add liquidity to a pool
   */
  addLiquidity(params: {
    poolId: string;
    coinA: { type: string; amount: string };
    coinB: { type: string; amount: string };
    signerAddress: string;
  }, privateKey: string): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }>;

  /**
   * Remove liquidity from a pool
   */
  removeLiquidity(params: {
    poolId: string;
    lpAmount: string;
    signerAddress: string;
  }, privateKey: string): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }>;
}