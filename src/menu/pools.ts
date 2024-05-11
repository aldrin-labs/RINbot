import { Menu } from '@grammyjs/menu';
import { CommonConversationId } from '../chains/conversations.config';
import { ownedAftermathPools } from '../chains/sui.functions';
import { enterConversation } from '../middleware/conversations/utils';
import { BotContext } from '../types';

const poolsMenu = new Menu<BotContext>('sui-pools')
  .text('Create Aftermath Pool', async (ctx) => {
    await enterConversation({ ctx, conversationId: CommonConversationId.CreateAftermathPool });
  })
  // .text('Create Cetus Pool', async (ctx) => {
  //   await enterConversation({ ctx, conversationId: CommonConversationId.CreateCetusPool });
  // })
  .row()
  .text('Owned Aftermath Pools', async (ctx) => {
    await ownedAftermathPools(ctx);
  })
  // .text('Owned Cetus Pools', async (ctx) => {
  //   await ownedCetusPools(ctx);
  // })
  // .row()
  // .text('Add Liquidity (Cetus)', async (ctx) => {
  //   await enterConversation({ ctx, conversationId: CommonConversationId.AddCetusPoolLiquidity });
  // })
  .row()
  .back('Home');

export default poolsMenu;
