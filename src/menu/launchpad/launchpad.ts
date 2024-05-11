import { Menu } from '@grammyjs/menu';
import { CommonConversationId } from '../../chains/conversations.config';
import { showSurfdogPage } from '../../chains/launchpad/surfdog/show-pages/showSurfdogPage';
import { enterConversation } from '../../middleware/conversations/utils';
import { BotContext } from '../../types';
import surfdogMenu from './surfdog/main';

const launchpadMenu = new Menu<BotContext>('launchpad')
  .text('Pools', async (ctx) => {
    ctx.menu.nav('sui-pools');
  })
  .text('Create Coin', async (ctx) => {
    await enterConversation({ ctx, conversationId: CommonConversationId.CreateCoin });
  })
  .row()
  .text('$SURFDOG', async (ctx) => {
    await showSurfdogPage(ctx);
  })
  .row()
  .back('Home');

launchpadMenu.register(surfdogMenu);

export default launchpadMenu;
