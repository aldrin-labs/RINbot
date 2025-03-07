/**
 * Chain utility functions for routing commands to the appropriate chain provider
 */
import { ChainType } from './config';
import { getChainProvider } from './providers';
import { IChainProvider } from './interfaces/IChainProvider';
import { BotContext } from '../types';

// Cache for chain providers to avoid recreating them
const chainProviderCache: Record<string, IChainProvider> = {};

/**
 * Get the chain provider for the selected chain in the user's session
 */
export async function getSelectedChainProvider(ctx: BotContext): Promise<IChainProvider> {
  const selectedChain = ctx.session.selectedChain || 'sui';

  // Return from cache if available
  if (chainProviderCache[selectedChain]) {
    return chainProviderCache[selectedChain];
  }

  // Create a new provider
  const provider = await getChainProvider(selectedChain as ChainType);

  // Cache the provider
  chainProviderCache[selectedChain] = provider;

  return provider;
}

/**
 * Get the wallet address for the selected chain in the user's session
 */
export function getSelectedChainWalletAddress(ctx: BotContext): string {
  const selectedChain = ctx.session.selectedChain || 'sui';

  // If the chain is SUI, use the legacy publicKey field for backward compatibility
  if (selectedChain === 'sui') {
    return ctx.session.publicKey;
  }

  // Otherwise, use the wallets object
  return ctx.session.wallets?.[selectedChain]?.publicKey || '';
}

/**
 * Get the wallet private key for the selected chain in the user's session
 */
export function getSelectedChainWalletPrivateKey(ctx: BotContext): string {
  const selectedChain = ctx.session.selectedChain || 'sui';

  // If the chain is SUI, use the legacy privateKey field for backward compatibility
  if (selectedChain === 'sui') {
    return ctx.session.privateKey;
  }

  // Otherwise, use the wallets object
  return ctx.session.wallets?.[selectedChain]?.privateKey || '';
}

/**
 * Generate a wallet for the specified chain
 */
export async function generateWalletForChain(chainType: ChainType): Promise<{ privateKey: string; publicKey: string }> {
  const provider = await getChainProvider(chainType);
  const walletInfo = provider.getWalletProvider().generateWallet();

  return {
    privateKey: walletInfo.privateKey,
    publicKey: walletInfo.address,
  };
}

/**
 * Get a formatted message for "coming soon" chains
 */
export function getComingSoonMessage(chainName: string): string {
  return (
    `${chainName} support is coming soon! 🚀

` + `We're working hard to bring you the best experience on ${chainName}. Stay tuned for updates!`
  );
}
