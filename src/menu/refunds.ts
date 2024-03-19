import { Menu } from '@grammyjs/menu';
import { checkUserIsEligibleToRefund } from '../chains/refunds/checkUserIsEligibleToRefund';
import { BotContext } from '../types';
import { home } from '../chains/sui.functions';

const refundsMenu = new Menu<BotContext>('refunds')
  .text('Check', async (ctx) => {
    await checkUserIsEligibleToRefund(ctx);
  })
  .row()
  .text('Home', async (ctx) => {
    await home(ctx);
  });

export default refundsMenu;
