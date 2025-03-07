/**
 * SUI Transaction Provider Implementation
 */
import { ChainConfig } from '../../config';
import { ITransaction, TransactionOptions, TransactionResult } from '../../interfaces/ITransaction';
import { getSuiProvider, WalletManagerSingleton, transactionFromSerializedTransaction } from '@avernikoz/rinbot-sui-sdk';

/**
 * SUI Transaction Provider Implementation
 */
export default class SuiTransactionProvider implements ITransaction {
  private config: ChainConfig;
  private provider: any;

  constructor(config: ChainConfig) {
    this.config = config;
    this.provider = getSuiProvider({ url: this.config.providerUrl });
  }

  /**
   * Sign and execute a transaction
   */
  async signAndExecuteTransaction(params: {
    transaction: any;
    privateKey: string;
    options?: TransactionOptions;
  }): Promise<TransactionResult> {
    const { transaction, privateKey, options } = params;
    
    try {
      // Set gas budget if provided
      if (options?.gasBudget) {
        transaction.setGasBudget(Number(options.gasBudget));
      }
      
      // Execute transaction
      const keyPair = WalletManagerSingleton.getKeyPairFromPrivateKey(privateKey);
      const result = await this.provider.signAndExecuteTransactionBlock({
        transactionBlock: transaction,
        signer: keyPair,
        options: {
          showEffects: true,
          showEvents: true,
          showBalanceChanges: true,
          showObjectChanges: true,
        },
        requestType: options?.waitForConfirmation ? 'WaitForLocalExecution' : undefined,
      });
      
      const success = result.effects?.status.status !== 'failure';
      
      return {
        txHash: result.digest,
        success,
        error: success ? undefined : 'Transaction failed',
        blockNumber: result.checkpoint, // SUI uses checkpoint instead of block number
        timestamp: Date.now(), // SUI doesn't provide timestamp directly
        fee: result.effects?.gasUsed?.computationCost || '0',
      };
    } catch (error) {
      console.error('Transaction execution error:', error);
      return {
        txHash: '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create a transaction object (chain-specific)
   */
  async createTransaction(params: Record<string, any>): Promise<any> {
    // This is a generic method that would need to be implemented based on the specific transaction type
    // For now, we'll assume the transaction creation is handled by specific methods in other services
    throw new Error('Use specific transaction creation methods from the SUI SDK');
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txHash: string): Promise<TransactionResult> {
    try {
      const result = await this.provider.getTransactionBlock({
        digest: txHash,
        options: {
          showEffects: true,
        },
      });
      
      const success = result.effects?.status.status !== 'failure';
      
      return {
        txHash,
        success,
        error: success ? undefined : 'Transaction failed',
        blockNumber: result.checkpoint,
        timestamp: Date.now(),
        fee: result.effects?.gasUsed?.computationCost || '0',
      };
    } catch (error) {
      console.error('Get transaction status error:', error);
      return {
        txHash,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get transaction details
   */
  async getTransactionDetails(txHash: string): Promise<Record<string, any>> {
    try {
      const result = await this.provider.getTransactionBlock({
        digest: txHash,
        options: {
          showEffects: true,
          showEvents: true,
          showBalanceChanges: true,
          showObjectChanges: true,
          showInput: true,
        },
      });
      
      return result;
    } catch (error) {
      console.error('Get transaction details error:', error);
      throw new Error(`Failed to get transaction details: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(transaction: any): Promise<string> {
    try {
      // SUI doesn't have a direct gas estimation method like Ethereum
      // We'll use a default gas budget for now
      return '10000000'; // Default gas budget
    } catch (error) {
      console.error('Estimate gas error:', error);
      throw new Error(`Failed to estimate gas: ${error instanceof Error ? error.message : String(error)}`);
    }
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
    try {
      return transaction.serialize();
    } catch (error) {
      console.error('Serialize transaction error:', error);
      throw new Error(`Failed to serialize transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Deserialize a transaction from storage
   */
  deserializeTransaction(serialized: string): any {
    try {
      return transactionFromSerializedTransaction(serialized);
    } catch (error) {
      console.error('Deserialize transaction error:', error);
      throw new Error(`Failed to deserialize transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
