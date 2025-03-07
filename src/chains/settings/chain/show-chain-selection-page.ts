import { BotContext } from '../../../types';
import { getChainSelectionKeyboard } from '../../../inline-keyboards/chain-selection';
import { enterConversation } from '../../../middleware/conversation';
import { CommonConversationId } from '../../conversations.config';

export async function showChainSelectionPage(ctx: BotContext): Promise<void> {
  await ctx.reply(
    '<b>Chain Selection</b>\n\n' +
    'Select the blockchain you want to use with RINbot:\n\n' +
    'Currently selected: <b>' + (ctx.session.selectedChain || 'sui').toUpperCase() + '</b>',
    { parse_mode: 'HTML', reply_markup: getChainSelectionKeyboard(ctx) }
  );
  
  // Enter the chain selection conversation
  await enterConversation(CommonConversationId.ChainSelection, ctx);
}