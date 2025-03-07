import { BotContext, ChainType, MyConversation } from '../../../types';
import { getChainSelectionKeyboard } from '../../../inline-keyboards/chain-selection';
import goHome from '../../../inline-keyboards/goHome';
import { generateWallet } from '../../sui.functions';

export async function chainSelectionConversation(conversation: MyConversation, ctx: BotContext): Promise<void> {
  // Display the chain selection menu
  await ctx.reply(
    '<b>Chain Selection</b>\n\n' +
    'Select the blockchain you want to use with RINbot:',
    { parse_mode: 'HTML', reply_markup: getChainSelectionKeyboard(ctx) }
  );

  // Wait for user to select a chain
  const response = await conversation.waitFor('callback_query:data', {
    otherwise: async (ctx) => {
      await ctx.reply('Please select a chain from the options above.');
    },
  });

  const callbackData = response.callbackQuery.data;
  
  // Handle back button
  if (callbackData === 'back-to-settings') {
    await response.answerCallbackQuery();
    return;
  }
  
  // Extract chain from callback data
  const chainMatch = callbackData.match(/^select-chain-(\w+)$/);
  if (!chainMatch) {
    await response.answerCallbackQuery('Invalid selection');
    return;
  }
  
  const selectedChain = chainMatch[1] as ChainType;
  await response.answerCallbackQuery(`Selected ${selectedChain.toUpperCase()}`);
  
  // Check if wallet exists for this chain
  if (!ctx.session.wallets?.[selectedChain]) {
    // Create a new wallet for this chain
    if (selectedChain === 'sui') {
      const { privateKey, publicKey } = generateWallet();
      ctx.session.wallets = ctx.session.wallets || {};
      ctx.session.wallets[selectedChain] = { privateKey, publicKey };
    } else {
      // For other chains, we'll implement wallet generation later
      // For now, just show a message
      await ctx.reply(
        `${selectedChain.toUpperCase()} integration is coming soon. Please select SUI for now.`,
        { reply_markup: goHome }
      );
      return;
    }
  }
  
  // Update the selected chain
  ctx.session.selectedChain = selectedChain;
  
  // For backward compatibility, update the legacy fields
  if (ctx.session.wallets[selectedChain]) {
    ctx.session.privateKey = ctx.session.wallets[selectedChain]!.privateKey;
    ctx.session.publicKey = ctx.session.wallets[selectedChain]!.publicKey;
  }
  
  // Show confirmation
  await ctx.reply(
    `You've selected <b>${selectedChain.toUpperCase()}</b> as your active chain.`,
    { parse_mode: 'HTML', reply_markup: goHome }
  );
}