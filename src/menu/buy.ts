import { home } from '../chains/sui.functions';
import { BotContext } from '../types';
import { Menu } from '@grammyjs/menu';
// import SuiApiSingleton from '../chains/sui';

const buy_menu = new Menu<BotContext>('buy-menu').text('Close', async (ctx) => {
  await ctx.conversation.exit();
  // const last_msg = ctx.msg?.message_id as number;
  // await ctx.deleteMessages([last_msg]);
  ctx.session.step = 'main';
  ctx.menu.close();
  // const sdk = await SuiApiSingleton.getInstance();
  // await sdk.home(ctx);

  await home(ctx)
});

export default buy_menu;
