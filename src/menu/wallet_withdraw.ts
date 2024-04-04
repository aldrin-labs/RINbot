import { Menu } from '@grammyjs/menu';
import { home } from '../chains/sui.functions';
import { BotContext } from '../types';

const withdraw_menu = new Menu<BotContext>('wallet-withdraw-menu').back('Home', async (ctx) => {
  await ctx.conversation.exit();
  const last_msg = ctx.msg?.message_id as number;
  await ctx.deleteMessages([last_msg]);
  ctx.menu.close();
  await home(ctx);
});

export default withdraw_menu;
