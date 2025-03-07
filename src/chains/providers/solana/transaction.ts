/**
 * Solana Transaction Provider Implementation
 */
import { ChainConfig } from '../../config';
import { ITransaction, TransactionOptions, TransactionResult } from '../../interfaces/ITransaction';

/**
 * Solana Transaction Provider Implementation
 * This is a placeholder implementation that shows "coming soon" messages
 */
export default class SolanaTransactionProvider implements ITransaction {
  private config: ChainConfig;

  constructor(config: ChainConfig) {
    this.config = config;
  }

  /**
   * Sign and execute a transaction
   */
  async signAndExecuteTransaction(params: {
    transaction: any;
    privateKey: string;
    options?: TransactionOptions;
  }): Promise<TransactionResult> {
    throw new Error('Solana support coming soon!');
  }

  /**
   * Create a transaction object (chain-specific)
   */
  async createTransaction(params: Record<string, any>): Promise<any> {
    throw new Error('Solana support coming soon!');
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txHash: string): Promise<TransactionResult> {
    throw new Error('Solana support coming soon!');
  }

  /**
   * Get transaction details
   */
  async getTransactionDetails(txHash: string): Promise<Record<string, any>> {
    throw new Error('Solana support coming soon!');
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(transaction: any): Promise<string> {
    throw new Error('Solana support coming soon!');
  }

  /**
   * Get the explorer link for a transaction
   */
  getExplorerLink(txHash: string): string {
    return `${this.config.explorerUrl}/tx/${txHash}`;
  }

  /**
   * Serialize a transaction for storage
   */
  serializeTransaction(transaction: any): string {
    throw new Error('Solana support coming soon!');
  }

  /**
   * Deserialize a transaction from storage
   */
  deserializeTransaction(serialized: string): any {
    throw new Error('Solana support coming soon!');
  }
}