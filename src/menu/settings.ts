/* eslint-disable max-len */
import { Menu } from '@grammyjs/menu';
import { showCoinWhitelist } from '../chains/coin-whitelist/showCoinWhitelist';
import { showFeesPage } from '../chains/fees/showFeesPage';
import { showSlippageConfiguration } from '../chains/settings/slippage/showSlippageConfiguration';
import { showSwapConfirmationPage } from '../chains/settings/swap-confirmation/show-swap-confirmation-page';
import { userMustUseCoinWhitelist } from '../chains/utils';
import { userAgreement } from '../home/user-agreement';
import goHome from '../inline-keyboards/goHome';
import { BotContext } from '../types';
import { showMainReferralPage } from '../chains/referral/pages/main';
import { showPriceDifferenceThresholdPage } from '../chains/settings/price-difference-threshold/show-price-difference-page';
import referralMenu from './referral/referral';

const settingsMenu = new Menu<BotContext>('settings')
  .text('Slippage', async (ctx) => {
    await showSlippageConfiguration(ctx);
  })
  .text('Fees', async (ctx) => {
    await showFeesPage(ctx);
  })
  .row()
  .text('Swap Confirmation', async (ctx) => {
    await showSwapConfirmationPage(ctx);
  })
  .text('Price Difference Threshold', async (ctx) => {
    await showPriceDifferenceThresholdPage(ctx);
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
  .text('Referral', async (ctx) => {
    await showMainReferralPage(ctx);
  })
  .back('Home');

settingsMenu.register(referralMenu);

export default settingsMenu;
