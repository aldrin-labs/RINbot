import { Menu } from '@grammyjs/menu';
import { ConversationId } from '../chains/conversations.config';
import { home } from '../chains/sui.functions';
import { BotContext } from '../types';

const refundsMenu = new Menu<BotContext>('refunds')
  // .text('Check Current Wallet', async (ctx) => {
  //   await ctx.conversation.enter(ConversationId.CheckCurrentWalletForRefund);
  // })
  // .row()
  .text('Check Address', async (ctx) => {
    await ctx.conversation.enter(ConversationId.CheckProvidedAddressForRefund);
  })
  .row()
  .text('Home', async (ctx) => {
    await home(ctx);
  });

export default refundsMenu;
