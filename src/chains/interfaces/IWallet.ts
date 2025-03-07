/**
 * IWallet interface defines the common methods for wallet operations across different chains.
 */
import { IAsset } from './IAsset';

export interface WalletBalance {
  available: string;
  total: string;
}

export interface WalletInfo {
  address: string;
  privateKey: string;
}

export interface IWallet {
  /**
   * Generate a new wallet
   */
  generateWallet(): WalletInfo;

  /**
   * Get the wallet balance
   */
  getBalance(address: string): Promise<WalletBalance>;

  /**
   * Get the available balance that can be withdrawn
   */
  getAvailableWithdrawAmount(address: string): Promise<{ availableAmount: string; totalGasFee: string }>;

  /**
   * Get all assets in the wallet
   */
  getAllAssets(address: string): Promise<IAsset[]>;

  /**
   * Withdraw funds from the wallet
   */
  withdraw(params: {
    fromAddress: string;
    toAddress: string;
    amount: string;
    privateKey: string;
  }): Promise<{ txHash: string; success: boolean }>;

  /**
   * Get the wallet from a private key
   */
  getWalletFromPrivateKey(privateKey: string): WalletInfo;

  /**
   * Validate an address
   */
  isValidAddress(address: string): boolean;

  /**
   * Get the explorer link for a wallet address
   */
  getExplorerLink(address: string): string;
}