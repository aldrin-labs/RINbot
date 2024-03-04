import { Menu } from '@grammyjs/menu';
import { ownedPools } from '../chains/sui.functions';
import { BotContext } from '../types';

const poolsMenu = new Menu<BotContext>('sui-pools')
  .text('Create Pool', async (ctx) => {
    await ctx.conversation.enter('createPool');
  })
  .text('Owned Pools', async (ctx) => {
    await ownedPools(ctx);
  })
  .row()
  .back('Home');

export default poolsMenu;
