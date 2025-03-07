/**
 * Export chain providers for easier imports
 */
import { ChainType, CHAIN_CONFIGS } from '../config';
import { IChainProvider } from '../interfaces/IChainProvider';

/**
 * Get a chain provider by chain type
 * This is a factory function that will be used to get the appropriate provider
 */
export async function getChainProvider(chainType: ChainType): Promise<IChainProvider> {
  // Get the chain configuration
  const config = CHAIN_CONFIGS[chainType];
  if (!config) {
    throw new Error(`No configuration found for chain type: ${chainType}`);
  }
  
  switch (chainType) {
    case ChainType.SUI:
      const { default: SuiProvider } = await import('./sui/provider');
      const suiProvider = new SuiProvider();
      await suiProvider.initialize(config);
      return suiProvider;
      
    case ChainType.SOLANA:
      const { default: SolanaProvider } = await import('./solana/provider');
      const solanaProvider = new SolanaProvider();
      await solanaProvider.initialize(config);
      return solanaProvider;
      
    case ChainType.SONIC_SVM:
      // Not yet implemented - show coming soon message
      throw new Error('Sonic SVM support coming soon!');
      
    case ChainType.SOON_SVM:
      // Not yet implemented - show coming soon message
      throw new Error('Soon SVM support coming soon!');
      
    case ChainType.ECLIPSE_SVM:
      // Not yet implemented - show coming soon message
      throw new Error('Eclipse SVM support coming soon!');
      
    default:
      throw new Error(`Unsupported chain type: ${chainType}`);
  }
}
