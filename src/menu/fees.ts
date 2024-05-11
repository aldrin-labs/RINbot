import { Menu } from '@grammyjs/menu';
import { CommonConversationId } from '../chains/conversations.config';
import { RINCEL_COIN_TYPE } from '../chains/sui.config';
import { home } from '../chains/sui.functions';
import { enterConversation } from '../middleware/conversations/utils';
import { BotContext } from '../types';

const feesMenu = new Menu<BotContext>('fees')
  .text('Buy RINCEL', async (ctx) => {
    ctx.session.tradeCoin = {
      coinType: RINCEL_COIN_TYPE,
      tradeAmountPercentage: '0',
      useSpecifiedCoin: true,
    };

    await enterConversation({ ctx, conversationId: CommonConversationId.Buy });
  })
  .row()
  .text('Home', async (ctx) => {
    await home(ctx);
  });

export default feesMenu;
