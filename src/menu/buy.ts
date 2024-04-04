import { Menu } from '@grammyjs/menu';
import { home } from '../chains/sui.functions';
import { BotContext } from '../types';

const buyMenu = new Menu<BotContext>('buy-menu').back('Home', async (ctx) => {
  await ctx.conversation.exit();
  ctx.menu.close();
  await home(ctx);
});

export default buyMenu;
