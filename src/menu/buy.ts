import { Menu } from '@grammyjs/menu';
import { home } from '../chains/sui.functions';
import { BotContext } from '../types';

const buy_menu = new Menu<BotContext>('buy-menu').back('Home', async (ctx) => {
  await ctx.conversation.exit();
  ctx.menu.close();
  await home(ctx);
});

export default buy_menu;
