import { Menu } from '@grammyjs/menu';
import { SurfdogConversationId } from '../../../chains/launchpad/surfdog/conversations/conversations.config';
import { showGlobalStats } from '../../../chains/launchpad/surfdog/show-pages/showGlobalStats';
import { showRules } from '../../../chains/launchpad/surfdog/show-pages/showRules';
import { showUserTickets } from '../../../chains/launchpad/surfdog/show-pages/showUserTickets';
import { home } from '../../../chains/sui.functions';
import { enterConversation } from '../../../middleware/conversations/utils';
import { BotContext } from '../../../types';
import globalStatsMenu from './globalStats';
import userTicketsMenu from './userTickets';

const surfdogMenu = new Menu<BotContext>('surfdog')
  .text('Your Tickets', async (ctx) => {
    await showUserTickets(ctx);
  })
  .text('Buy Tickets', async (ctx) => {
    await enterConversation({ ctx, conversationId: SurfdogConversationId.BuySurfdogTickets });
  })
  .row()
  .text('Global Stats', async (ctx) => {
    await showGlobalStats(ctx);
  })
  .text('Rules', async (ctx) => {
    await showRules(ctx);
  })
  .row()
  .text('Home', async (ctx) => {
    await home(ctx);
    await ctx.answerCallbackQuery();
  });

surfdogMenu.register(globalStatsMenu);
surfdogMenu.register(userTicketsMenu);

export default surfdogMenu;
