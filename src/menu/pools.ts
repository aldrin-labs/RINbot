import { Menu } from '@grammyjs/menu';
import { ConversationId } from '../chains/conversations.config';
import { ownedCetusPools } from '../chains/pools/cetus/get-owned-pools';
import { ownedAftermathPools } from '../chains/sui.functions';
import { BotContext } from '../types';

const poolsMenu = new Menu<BotContext>('sui-pools')
  .text('Create Aftermath Pool', async (ctx) => {
    await ctx.conversation.enter(ConversationId.CreateAftermathPool);
  })
  .text('Create Cetus Pool', async (ctx) => {
    await ctx.conversation.enter(ConversationId.CreateCetusPool);
  })
  .row()
  .text('Owned Aftermath Pools', async (ctx) => {
    await ownedAftermathPools(ctx);
  })
  .text('Owned Cetus Pools', async (ctx) => {
    await ownedCetusPools(ctx);
  })
  .row()
  .text('Add Liquidity (Cetus)', async (ctx) => {
    await ctx.conversation.enter(ConversationId.AddCetusPoolLiquidity);
  })
  .row()
  .back('Home');

export default poolsMenu;
