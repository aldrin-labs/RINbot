import { Menu } from '@grammyjs/menu';
import { SurfdogConversationId } from '../../../chains/launchpad/surfdog/conversations/conversations.config';
import { showGlobalStats } from '../../../chains/launchpad/surfdog/show-pages/showGlobalStats';
import { showUserTickets } from '../../../chains/launchpad/surfdog/show-pages/showUserTickets';
import { home } from '../../../chains/sui.functions';
import { BotContext } from '../../../types';
import globalStatsMenu from './globalStats';
import userTicketsMenu from './userTickets';
import { showRules } from '../../../chains/launchpad/surfdog/show-pages/showRules';

const surfdogMenu = new Menu<BotContext>('surfdog')
  .text('Your Tickets', async (ctx) => {
    await showUserTickets(ctx);
  })
  .text('Buy Tickets', async (ctx) => {
    await ctx.conversation.enter(SurfdogConversationId.BuySurfdogTickets);
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
