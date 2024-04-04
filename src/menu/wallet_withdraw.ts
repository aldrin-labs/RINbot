import { Menu } from '@grammyjs/menu';
import { home } from '../chains/sui.functions';
import { BotContext } from '../types';

const withdrawMenu = new Menu<BotContext>('wallet-withdraw-menu').back('Home', async (ctx) => {
  await ctx.conversation.exit();
  const lastMsg = ctx.msg?.message_id as number;
  await ctx.deleteMessages([lastMsg]);
  ctx.menu.close();
  await home(ctx);
});

export default withdrawMenu;
