import { BotContext } from '../types';
import menu from '../menu/main';
import { home as suiHome } from './sui.functions';

/**
 * Display the home screen based on the selected chain
 * @param ctx Bot context
 * @param refresh Whether to refresh the screen
 */
export async function home(ctx: BotContext, refresh: boolean = false) {
  // Get the selected chain from the session
  const selectedChain = ctx.session.selectedChain || 'sui';

  // Call the appropriate chain-specific home function
  switch (selectedChain) {
    case 'sui':
      await suiHome(ctx, refresh);
      break;
    case 'solana':
      // For now, show a message that Solana is coming soon
      await ctx.reply(
        '<b>Solana integration coming soon!</b>\n\n' +
          "We're working on integrating Solana. For now, you can use SUI chain.\n\n" +
          'Switch to SUI in Settings > Chain Selection.',
        { parse_mode: 'HTML', reply_markup: menu },
      );
      break;
    case 'ethereum':
      // For now, show a message that Ethereum is coming soon
      await ctx.reply(
        '<b>Ethereum integration coming soon!</b>\n\n' +
          "We're working on integrating Ethereum. For now, you can use SUI chain.\n\n" +
          'Switch to SUI in Settings > Chain Selection.',
        { parse_mode: 'HTML', reply_markup: menu },
      );
      break;
    default:
      // Default to SUI if the chain is not recognized
      await suiHome(ctx, refresh);
      break;
  }
}
