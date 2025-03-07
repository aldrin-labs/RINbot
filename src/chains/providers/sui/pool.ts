/**
 * SUI Pool Provider Implementation
 */
import { ChainConfig } from '../../config';
import {
  IPool,
  PoolProvider,
  PoolData,
  CreatePoolParams,
  SwapParams,
  SwapQuote,
} from '../../interfaces/IPool';
import { 
  getSuiProvider, 
  WalletManagerSingleton, 
  AftermathSingleton,
  getLpCoinDecimals
} from '@avernikoz/rinbot-sui-sdk';
import BigNumber from 'bignumber.js';

/**
 * SUI Pool Provider Implementation
 */
export default class SuiPoolProvider implements IPool {
  private config: ChainConfig;
  private provider: any;
  private aftermath: any;
  private routeManager: any;

  constructor(config: ChainConfig) {
    this.config = config;
    this.provider = getSuiProvider({ url: this.config.providerUrl });
  }

  /**
   * Initialize the aftermath singleton
   */
  private async initAftermath() {
    if (!this.aftermath) {
      // We need to import these dynamically to avoid circular dependencies
      const { getAftermath } = await import('../../sui.functions');
      this.aftermath = await getAftermath();
    }
    return this.aftermath;
  }

  /**
   * Initialize the route manager
   */
  private async initRouteManager() {
    if (!this.routeManager) {
      // We need to import these dynamically to avoid circular dependencies
      const { getRouteManager } = await import('../../sui.functions');
      this.routeManager = await getRouteManager();
    }
    return this.routeManager;
  }

  /**
   * Get all available pool providers
   */
  getPoolProviders(): PoolProvider[] {
    return [
      { name: 'Aftermath', id: 'aftermath' },
      { name: 'Cetus', id: 'cetus' },
      { name: 'Turbos', id: 'turbos' },
      { name: 'Flowx', id: 'flowx' },
      { name: 'Interest Protocol', id: 'interest-protocol' },
    ];
  }

  /**
   * Get pools owned by an address
   */
  async getOwnedPools(address: string): Promise<PoolData[]> {
    try {
      const aftermath = await this.initAftermath();
      
      // Import dynamically to avoid circular dependencies
      const { getWalletManager, getCoinManager } = await import('../../sui.functions');
      const walletManager = await getWalletManager();
      const coinManager = await getCoinManager();
      
      // Get all assets
      const allAssets = await walletManager.getAllCoinAssets(address);
      
      // Get owned pools info
      const ownedPoolInfos = await aftermath.getOwnedPoolsInfo(allAssets, coinManager);
      
      // Convert to the format expected by the interface
      return ownedPoolInfos.map(poolInfo => ({
        id: poolInfo.poolObjectId,
        name: poolInfo.name,
        provider: { name: 'Aftermath', id: 'aftermath' },
        coins: poolInfo.coins.map(coin => ({
          name: coin.name || coin.symbol || '',
          symbol: coin.symbol || '',
          decimals: coin.decimals || 0,
          type: coin.type,
          address: coin.type,
          balance: coin.balance,
        })),
        tvl: poolInfo.tvl,
        volume24h: poolInfo.volume,
        apr: poolInfo.apr,
        fees: poolInfo.fees,
        feePercent: parseFloat(poolInfo.feePercent || '0'),
      }));
    } catch (error) {
      console.error(`Failed to get owned pools for ${address}:`, error);
      return [];
    }
  }

  /**
   * Get pool by ID
   */
  async getPoolById(poolId: string): Promise<PoolData | null> {
    try {
      const aftermath = await this.initAftermath();
      
      // Get pool info
      const poolInfo = await aftermath.getPoolInfo(poolId);
      
      if (!poolInfo) {
        return null;
      }
      
      // Convert to the format expected by the interface
      return {
        id: poolInfo.poolObjectId,
        name: poolInfo.name,
        provider: { name: 'Aftermath', id: 'aftermath' },
        coins: poolInfo.coins.map(coin => ({
          name: coin.name || coin.symbol || '',
          symbol: coin.symbol || '',
          decimals: coin.decimals || 0,
          type: coin.type,
          address: coin.type,
          balance: coin.balance,
        })),
        tvl: poolInfo.tvl,
        volume24h: poolInfo.volume,
        apr: poolInfo.apr,
        fees: poolInfo.fees,
        feePercent: parseFloat(poolInfo.feePercent || '0'),
      };
    } catch (error) {
      console.error(`Failed to get pool by ID ${poolId}:`, error);
      return null;
    }
  }

  /**
   * Create a new liquidity pool
   */
  async createPool(params: CreatePoolParams, privateKey: string): Promise<{
    success: boolean;
    poolId?: string;
    txHash?: string;
    error?: string;
  }> {
    try {
      const aftermath = await this.initAftermath();
      
      const {
        coinA,
        coinB,
        feePercent,
        poolName,
        lpCoinMetadata,
        signerAddress,
      } = params;
      
      // Import dynamically to avoid circular dependencies
      const { getCoinManager } = await import('../../sui.functions');
      const coinManager = await getCoinManager();
      
      // Get coin metadata
      const coinAMetadata = await coinManager.fetchCoinMetadata(coinA.type);
      const coinBMetadata = await coinManager.fetchCoinMetadata(coinB.type);
      
      if (!coinAMetadata || !coinBMetadata) {
        return {
          success: false,
          error: 'Failed to fetch coin metadata',
        };
      }
      
      // Calculate weights
      const { weightA, weightB } = await aftermath.getWeights({
        coinA: {
          type: coinA.type,
          amount: coinA.amount,
        },
        coinB: {
          type: coinB.type,
          amount: coinB.amount,
        },
      });
      
      // Calculate raw amounts
      const rawAmountA = new BigNumber(coinA.amount).multipliedBy(10 ** coinAMetadata.decimals).toString();
      const rawAmountB = new BigNumber(coinB.amount).multipliedBy(10 ** coinBMetadata.decimals).toString();
      
      // Prepare coins info
      const coinsInfo = {
        coinA: {
          coinType: coinA.type,
          weight: weightA,
          decimals: coinAMetadata.decimals,
          tradeFeeIn: feePercent / 100,
          initialDeposit: BigInt(rawAmountA),
        },
        coinB: {
          coinType: coinB.type,
          weight: weightB,
          decimals: coinBMetadata.decimals,
          tradeFeeIn: feePercent / 100,
          initialDeposit: BigInt(rawAmountB),
        },
      };
      
      // Calculate LP coin decimals
      const lpCoinDecimals = getLpCoinDecimals(coinsInfo);
      
      // Create LP coin transaction
      const createLpCoinTransaction = await aftermath.getCreateLpCoinTransaction({
        publicKey: signerAddress,
        lpCoinDecimals,
      });
      
      // Execute LP coin transaction
      const createLpCoinResult = await this.provider.signAndExecuteTransactionBlock({
        transactionBlock: createLpCoinTransaction,
        signer: WalletManagerSingleton.getKeyPairFromPrivateKey(privateKey),
        options: {
          showEvents: true,
          showBalanceChanges: true,
          showEffects: true,
          showObjectChanges: true,
        },
        requestType: 'WaitForLocalExecution',
      });
      
      const lpCoinSuccess = createLpCoinResult.effects?.status.status !== 'failure';
      
      if (!lpCoinSuccess) {
        return {
          success: false,
          txHash: createLpCoinResult.digest,
          error: 'LP coin creation failed',
        };
      }
      
      // Wait for the LP coin to be indexed
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Create pool transaction
      const createPoolTransaction = await aftermath.getCreatePoolTransaction({
        publicKey: signerAddress,
        createLpCoinTransactionResult: createLpCoinResult,
        poolName,
        coinsInfo,
        lpCoinMetadata,
      });
      
      // Execute pool transaction
      const createPoolResult = await this.provider.signAndExecuteTransactionBlock({
        transactionBlock: createPoolTransaction,
        signer: WalletManagerSingleton.getKeyPairFromPrivateKey(privateKey),
        options: {
          showEvents: true,
          showBalanceChanges: true,
          showEffects: true,
          showObjectChanges: true,
        },
        requestType: 'WaitForLocalExecution',
      });
      
      const poolSuccess = createPoolResult.effects?.status.status !== 'failure';
      
      if (!poolSuccess) {
        return {
          success: false,
          txHash: createPoolResult.digest,
          error: 'Pool creation failed',
        };
      }
      
      // Extract pool ID from the transaction result
      const poolId = this.extractPoolIdFromTransaction(createPoolResult);
      
      return {
        success: true,
        poolId,
        txHash: createPoolResult.digest,
      };
    } catch (error) {
      console.error('Create pool error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Extract pool ID from transaction result
   * This is a simplified implementation - in a real scenario, you'd need to parse the events
   */
  private extractPoolIdFromTransaction(txResult: any): string | undefined {
    try {
      // This is a placeholder - in a real implementation, you'd need to parse the events
      // to find the exact pool ID that was created
      const events = txResult.events || [];
      const poolCreationEvent = events.find((event: any) => 
        event.type.includes('PoolCreated') || 
        event.type.includes('pool') || 
        event.type.includes('Pool')
      );
      
      if (poolCreationEvent && poolCreationEvent.parsedJson && poolCreationEvent.parsedJson.poolId) {
        return poolCreationEvent.parsedJson.poolId;
      }
      
      // Fallback: try to find it in object changes
      const objectChanges = txResult.objectChanges || [];
      const poolCreationObject = objectChanges.find((change: any) => 
        change.objectType && (change.objectType.includes('Pool') || change.objectType.includes('pool'))
      );
      
      if (poolCreationObject && poolCreationObject.objectId) {
        return poolCreationObject.objectId;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error extracting pool ID from transaction:', error);
      return undefined;
    }
  }

  /**
   * Get swap quote
   */
  async getSwapQuote(params: SwapParams): Promise<SwapQuote> {
    try {
      const routeManager = await this.initRouteManager();
      
      const {
        fromAsset,
        toAsset,
        amount,
        slippagePercent,
      } = params;
      
      // Get the best route
      const bestRoute = await routeManager.getBestRoute({
        fromCoinType: fromAsset,
        toCoinType: toAsset,
        amount,
        slippage: slippagePercent / 100,
      });
      
      if (!bestRoute) {
        throw new Error('No route found');
      }
      
      // Convert to the format expected by the interface
      return {
        fromAmount: amount,
        toAmount: bestRoute.expectedAmountOut,
        priceImpact: bestRoute.priceImpact.toString(),
        fee: bestRoute.fee.toString(),
        route: bestRoute.dexes.map(dex => ({
          name: dex,
          id: dex.toLowerCase(),
        })),
        minReceived: bestRoute.minAmountOut,
      };
    } catch (error) {
      console.error('Get swap quote error:', error);
      throw new Error(`Failed to get swap quote: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a swap
   */
  async executeSwap(params: SwapParams, privateKey: string): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    try {
      const routeManager = await this.initRouteManager();
      
      const {
        fromAsset,
        toAsset,
        amount,
        slippagePercent,
        signerAddress,
      } = params;
      
      // Get the best route transaction
      const txBlock = await routeManager.getBestRouteTransaction({
        fromCoinType: fromAsset,
        toCoinType: toAsset,
        amount,
        slippage: slippagePercent / 100,
        senderAddress: signerAddress,
      });
      
      if (!txBlock) {
        return {
          success: false,
          error: 'Failed to create transaction',
        };
      }
      
      // Execute the transaction
      const result = await this.provider.signAndExecuteTransactionBlock({
        transactionBlock: txBlock,
        signer: WalletManagerSingleton.getKeyPairFromPrivateKey(privateKey),
        options: {
          showEffects: true,
        },
      });
      
      const success = result.effects?.status.status !== 'failure';
      
      return {
        success,
        txHash: result.digest,
        error: success ? undefined : 'Swap failed',
      };
    } catch (error) {
      console.error('Execute swap error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get the explorer link for a pool
   */
  getPoolExplorerLink(poolId: string): string {
    return `${this.config.explorerUrl}/object/${poolId}`;
  }

  /**
   * Add liquidity to a pool
   */
  async addLiquidity(params: {
    poolId: string;
    coinA: { type: string; amount: string };
    coinB: { type: string; amount: string };
    signerAddress: string;
  }, privateKey: string): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    try {
      const aftermath = await this.initAftermath();
      
      const {
        poolId,
        coinA,
        coinB,
        signerAddress,
      } = params;
      
      // Get add liquidity transaction
      const txBlock = await aftermath.getAddLiquidityTransaction({
        poolObjectId: poolId,
        coinA: {
          type: coinA.type,
          amount: coinA.amount,
        },
        coinB: {
          type: coinB.type,
          amount: coinB.amount,
        },
        senderAddress: signerAddress,
      });
      
      if (!txBlock) {
        return {
          success: false,
          error: 'Failed to create transaction',
        };
      }
      
      // Execute the transaction
      const result = await this.provider.signAndExecuteTransactionBlock({
        transactionBlock: txBlock,
        signer: WalletManagerSingleton.getKeyPairFromPrivateKey(privateKey),
        options: {
          showEffects: true,
        },
      });
      
      const success = result.effects?.status.status !== 'failure';
      
      return {
        success,
        txHash: result.digest,
        error: success ? undefined : 'Add liquidity failed',
      };
    } catch (error) {
      console.error('Add liquidity error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Remove liquidity from a pool
   */
  async removeLiquidity(params: {
    poolId: string;
    lpAmount: string;
    signerAddress: string;
  }, privateKey: string): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    try {
      const aftermath = await this.initAftermath();
      
      const {
        poolId,
        lpAmount,
        signerAddress,
      } = params;
      
      // Get remove liquidity transaction
      const txBlock = await aftermath.getRemoveLiquidityTransaction({
        poolObjectId: poolId,
        lpAmount,
        senderAddress: signerAddress,
      });
      
      if (!txBlock) {
        return {
          success: false,
          error: 'Failed to create transaction',
        };
      }
      
      // Execute the transaction
      const result = await this.provider.signAndExecuteTransactionBlock({
        transactionBlock: txBlock,
        signer: WalletManagerSingleton.getKeyPairFromPrivateKey(privateKey),
        options: {
          showEffects: true,
        },
      });
      
      const success = result.effects?.status.status !== 'failure';
      
      return {
        success,
        txHash: result.digest,
        error: success ? undefined : 'Remove liquidity failed',
      };
    } catch (error) {
      console.error('Remove liquidity error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
