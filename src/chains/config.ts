/**
 * Chain configuration for all supported chains
 */

/**
 * Enum of supported chain types
 */
export enum ChainType {
  SUI = 'sui',
  SOLANA = 'solana',
  SONIC_SVM = 'sonic-svm',
  SOON_SVM = 'soon-svm',
  ECLIPSE_SVM = 'eclipse-svm',
}

/**
 * Interface for chain configuration
 */
export interface ChainConfig {
  id: string;
  name: string;
  providerUrl: string;
  explorerUrl: string;
  nativeToken: {
    symbol: string;
    decimals: number;
  };
  enabled: boolean;
  testnet: boolean;
}

/**
 * Configuration for SUI chain
 */
export const SUI_CONFIG: ChainConfig = {
  id: ChainType.SUI,
  name: 'Sui Network',
  providerUrl: 'https://sui-mainnet.blastapi.io/55fade13-b920-4956-bd54-d7ab2311776e',
  explorerUrl: 'https://suiscan.xyz/mainnet',
  nativeToken: {
    symbol: 'SUI',
    decimals: 9,
  },
  enabled: true,
  testnet: false,
};

/**
 * Configuration for Solana chain
 */
export const SOLANA_CONFIG: ChainConfig = {
  id: ChainType.SOLANA,
  name: 'Solana',
  providerUrl: 'https://api.mainnet-beta.solana.com',
  explorerUrl: 'https://explorer.solana.com',
  nativeToken: {
    symbol: 'SOL',
    decimals: 9,
  },
  enabled: false, // Not yet implemented
  testnet: false,
};

/**
 * Configuration for Sonic SVM chain
 */
export const SONIC_SVM_CONFIG: ChainConfig = {
  id: ChainType.SONIC_SVM,
  name: 'Sonic SVM',
  providerUrl: '', // To be filled when available
  explorerUrl: '', // To be filled when available
  nativeToken: {
    symbol: 'SONIC',
    decimals: 9,
  },
  enabled: false, // Not yet implemented
  testnet: false,
};

/**
 * Configuration for Soon SVM chain
 */
export const SOON_SVM_CONFIG: ChainConfig = {
  id: ChainType.SOON_SVM,
  name: 'Soon SVM',
  providerUrl: '', // To be filled when available
  explorerUrl: '', // To be filled when available
  nativeToken: {
    symbol: 'SOON',
    decimals: 9,
  },
  enabled: false, // Not yet implemented
  testnet: false,
};

/**
 * Configuration for Eclipse SVM chain
 */
export const ECLIPSE_SVM_CONFIG: ChainConfig = {
  id: ChainType.ECLIPSE_SVM,
  name: 'Eclipse SVM',
  providerUrl: '', // To be filled when available
  explorerUrl: '', // To be filled when available
  nativeToken: {
    symbol: 'ECLIPSE',
    decimals: 9,
  },
  enabled: false, // Not yet implemented
  testnet: false,
};

/**
 * Map of all chain configurations
 */
export const CHAIN_CONFIGS: Record<ChainType, ChainConfig> = {
  [ChainType.SUI]: SUI_CONFIG,
  [ChainType.SOLANA]: SOLANA_CONFIG,
  [ChainType.SONIC_SVM]: SONIC_SVM_CONFIG,
  [ChainType.SOON_SVM]: SOON_SVM_CONFIG,
  [ChainType.ECLIPSE_SVM]: ECLIPSE_SVM_CONFIG,
};

/**
 * Get chain configuration by chain ID
 */
export function getChainConfig(chainId: string): ChainConfig | undefined {
  return Object.values(CHAIN_CONFIGS).find((config) => config.id === chainId);
}

/**
 * Get all enabled chain configurations
 */
export function getEnabledChainConfigs(): ChainConfig[] {
  return Object.values(CHAIN_CONFIGS).filter((config) => config.enabled);
}
