import { Menu } from '@grammyjs/menu';
import { CommonConversationId } from '../chains/conversations.config';
import { home } from '../chains/sui.functions';
import { enterConversation } from '../middleware/conversations/utils';
import { BotContext } from '../types';

const refundsMenu = new Menu<BotContext>('refunds')
  // .text('Check Current Wallet', async (ctx) => {
  //   await enterConversation({ ctx, conversationId: CommonConversationId.CheckCurrentWalletForRefund });
  // })
  // .row()
  .text('Check Address', async (ctx) => {
    await enterConversation({ ctx, conversationId: CommonConversationId.CheckProvidedAddressForRefund });
  })
  .row()
  .text('Home', async (ctx) => {
    await home(ctx);
  });

export default refundsMenu;
