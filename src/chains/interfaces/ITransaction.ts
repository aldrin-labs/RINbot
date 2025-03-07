/**
 * ITransaction interface defines the common methods for transaction operations across different chains.
 */

export interface TransactionResult {
  txHash: string;
  success: boolean;
  error?: string;
  blockNumber?: number;
  timestamp?: number;
  fee?: string;
}

export interface TransactionOptions {
  gasBudget?: string;
  gasPrice?: string;
  timeout?: number;
  waitForConfirmation?: boolean;
}

export interface ITransaction {
  /**
   * Sign and execute a transaction
   */
  signAndExecuteTransaction(params: {
    transaction: any; // Chain-specific transaction object
    privateKey: string;
    options?: TransactionOptions;
  }): Promise<TransactionResult>;

  /**
   * Create a transaction object (chain-specific)
   */
  createTransaction(params: Record<string, any>): Promise<any>;

  /**
   * Get transaction status
   */
  getTransactionStatus(txHash: string): Promise<TransactionResult>;

  /**
   * Get transaction details
   */
  getTransactionDetails(txHash: string): Promise<Record<string, any>>;

  /**
   * Estimate gas for a transaction
   */
  estimateGas(transaction: any): Promise<string>;

  /**
   * Get the explorer link for a transaction
   */
  getExplorerLink(txHash: string): string;

  /**
   * Serialize a transaction for storage
   */
  serializeTransaction(transaction: any): string;

  /**
   * Deserialize a transaction from storage
   */
  deserializeTransaction(serialized: string): any;
}