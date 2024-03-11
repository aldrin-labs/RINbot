import { Menu } from '@grammyjs/menu';
import { ConversationId } from '../chains/conversations.config';
import { showActiveDCAs } from '../chains/dca/showActiveDCAs';
import { BotContext } from '../types';

const dcaMenu = new Menu<BotContext>('sui-dca')
  .text('Create DCA', async (ctx) => {
    await ctx.conversation.enter(ConversationId.CreateDca);
  })
  .text('Active DCAs', async (ctx) => {
    await showActiveDCAs(ctx);
  })
  .row()
  .back('Home');

export default dcaMenu;
