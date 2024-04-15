import { Menu } from '@grammyjs/menu';
import { showFeesPage } from '../chains/fees/showFeesPage';
import { showSlippageConfiguration } from '../chains/settings/slippage/showSlippageConfiguration';
import goHome from '../inline-keyboards/goHome';
import { BotContext } from '../types';
import { showCoinWhitelist } from '../chains/coin-whitelist/showCoinWhitelist';
import { userMustUseCoinWhitelist } from '../chains/utils';
import { userAgreement } from '../home/user-agreement';
import { showSwapConfirmationPage } from '../chains/settings/swap-confirmation/show-swap-confirmation-page';

const settingsMenu = new Menu<BotContext>('settings')
  .text('Slippage', async (ctx) => {
    await showSlippageConfiguration(ctx);
  })
  .text('Fees', async (ctx) => {
    await showFeesPage(ctx);
  })
  .row()
  .dynamic((ctx, range) => {
    if (userMustUseCoinWhitelist(ctx)) {
      range.text('Coin Whitelist', async (ctx) => {
        await showCoinWhitelist(ctx);
      });
    }
  })
  .text('User Agreement', async (ctx) => {
    await ctx.reply(userAgreement, { parse_mode: 'HTML', reply_markup: goHome });
  })
  .row()
  .text('Swap Confirmation', async (ctx) => {
    await showSwapConfirmationPage(ctx);
  })
  .back('Home');

export default settingsMenu;
