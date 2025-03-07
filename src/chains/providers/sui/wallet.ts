/**
 * SUI Wallet Provider Implementation
 */
import { ChainConfig } from '../../config';
import { IWallet, WalletBalance, WalletInfo } from '../../interfaces/IWallet';
import { IAsset } from '../../interfaces/IAsset';
import { WalletManagerSingleton, isValidSuiAddress, getSuiProvider } from '@avernikoz/rinbot-sui-sdk';
import { AssetData } from '../../interfaces/IAsset';

/**
 * SUI Wallet Provider Implementation
 */
export default class SuiWalletProvider implements IWallet {
  private config: ChainConfig;
  private provider: any;
  private walletManager: any;

  constructor(config: ChainConfig) {
    this.config = config;
    this.provider = getSuiProvider({ url: this.config.providerUrl });
  }

  /**
   * Initialize the wallet manager
   */
  private async initWalletManager() {
    if (!this.walletManager) {
      // We need to import these dynamically to avoid circular dependencies
      const { getCoinManager } = await import('../../sui.functions');
      const coinManager = await getCoinManager();
      this.walletManager = WalletManagerSingleton.getInstance(this.provider, coinManager);
    }
    return this.walletManager;
  }

  /**
   * Generate a new wallet
   */
  generateWallet(): WalletInfo {
    return WalletManagerSingleton.generateWallet();
  }

  /**
   * Get the wallet balance
   */
  async getBalance(address: string): Promise<WalletBalance> {
    const walletManager = await this.initWalletManager();
    const suiBalance = await walletManager.getSuiBalance(address);
    
    return {
      available: suiBalance,
      total: suiBalance,
    };
  }

  /**
   * Get the available balance that can be withdrawn
   */
  async getAvailableWithdrawAmount(address: string): Promise<{ availableAmount: string; totalGasFee: string }> {
    const walletManager = await this.initWalletManager();
    return await walletManager.getAvailableWithdrawSuiAmount(address);
  }

  /**
   * Get all assets in the wallet
   */
  async getAllAssets(address: string): Promise<AssetData[]> {
    const walletManager = await this.initWalletManager();
    const assets = await walletManager.getAllCoinAssets(address);
    
    // Convert to the format expected by the interface
    return assets.map(asset => ({
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
  }

  /**
   * Withdraw funds from the wallet
   */
  async withdraw(params: {
    fromAddress: string;
    toAddress: string;
    amount: string;
    privateKey: string;
  }): Promise<{ txHash: string; success: boolean }> {
    const { fromAddress, toAddress, amount, privateKey } = params;
    
    try {
      // Create transaction
      const txBlock = await WalletManagerSingleton.getWithdrawSuiTransaction({
        amount,
        address: toAddress,
      });
      
      // Get gas budget
      const walletManager = await this.initWalletManager();
      const { totalGasFee } = await walletManager.getAvailableWithdrawSuiAmount(fromAddress);
      txBlock.setGasBudget(Number(totalGasFee));
      
      // Execute transaction
      const res = await this.provider.signAndExecuteTransactionBlock({
        transactionBlock: txBlock,
        signer: WalletManagerSingleton.getKeyPairFromPrivateKey(privateKey),
        options: {
          showEffects: true,
        },
      });
      
      const success = res.effects?.status.status !== 'failure';
      
      return {
        txHash: res.digest,
        success,
      };
    } catch (error) {
      console.error('Withdraw error:', error);
      throw new Error(`Withdrawal failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the wallet from a private key
   */
  getWalletFromPrivateKey(privateKey: string): WalletInfo {
    const keyPair = WalletManagerSingleton.getKeyPairFromPrivateKey(privateKey);
    return {
      privateKey,
      address: keyPair.getPublicKey().toSuiAddress(),
    };
  }

  /**
   * Validate an address
   */
  isValidAddress(address: string): boolean {
    return isValidSuiAddress(address);
  }

  /**
   * Get the explorer link for a wallet address
   */
  getExplorerLink(address: string): string {
    return `${this.config.explorerUrl}/account/${address}`;
  }
}
