import { BotContext, ChainType, SessionData } from '../types';

/**
 * Migration to add multichain support to the session data
 * This will update the session data structure to support multiple chains
 */
export async function addMultichainSupport(ctx: BotContext): Promise<void> {
  // Skip if already migrated
  if (ctx.session.selectedChain && ctx.session.wallets) {
    return;
  }

  // Set default chain to SUI
  ctx.session.selectedChain = 'sui' as ChainType;

  // Initialize wallets object
  ctx.session.wallets = {};

  // Migrate existing wallet to SUI wallet
  if (ctx.session.privateKey && ctx.session.publicKey) {
    ctx.session.wallets.sui = {
      privateKey: ctx.session.privateKey,
      publicKey: ctx.session.publicKey,
    };
  }

  // Migrate assets structure
  if (ctx.session.assets && !('sui' in ctx.session.assets)) {
    const currentAssets = { ...ctx.session.assets };
    ctx.session.assets = {
      sui: currentAssets,
    } as SessionData['assets'];
  }
}
