import { Menu } from '@grammyjs/menu';
import { SurfdogConversationId } from '../../../chains/launchpad/surfdog/conversations/conversations.config';
import { showSurfdogPage } from '../../../chains/launchpad/surfdog/show-pages/showSurfdogPage';
import { BotContext } from '../../../types';

const userTicketsMenu = new Menu<BotContext>('surfdog-user-tickets')
  .text('Buy Tickets (TBA)', async (ctx) => {
    // TODO: Uncomment before launch
    // await ctx.conversation.enter(SurfdogConversationId.BuySurfdogTickets);

    await ctx.reply(`Follow @SurfDog_Sui on X for updates on the launch date.`);
  })
  .text('Back', async (ctx) => {
    await showSurfdogPage(ctx);
  });

export default userTicketsMenu;
