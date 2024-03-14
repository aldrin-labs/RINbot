import { Menu, MenuRange } from '@grammyjs/menu';
import { assets, nftHome } from '../chains/sui.functions';
import goHome from '../inline-keyboards/goHome';
import { BotContext } from '../types';
import activeDcas from './active-dcas';
import alerts_menu from './alerts';
import buy_menu from './buy';
import dcaMenu from './dca';
import help_menu from './help';
import launchpadMenu from './launchpad/launchpad';
import globalStatsMenu from './launchpad/surfdog/globalStats';
import surfdogMenu from './launchpad/surfdog/main';
import { nft_exit_menu, nft_menu } from './nft';
import poolsMenu from './pools';
import positions_menu from './positions';
import refer_menu from './refer';
import settings_menu from './settings';
import wallet_menu from './wallet';
import deposit_menu from './wallet_deposit';
import withdraw_menu from './wallet_withdraw';
import { ConversationId } from '../chains/conversations.config';
import { showSlippageConfiguration } from '../chains/slippage/showSlippageConfiguration';
import { ENABLE_WELCOME_BONUS } from '../config/bot.config';

const menu = new Menu<BotContext>('main')
  .text('Buy', async (ctx) => {
    ctx.session.step = 'buy';
    await ctx.conversation.enter('buy');
  })
  .text('Sell & Manage', async (ctx) => {
    ctx.session.step = 'positions';
    await assets(ctx);
  })
  .row()
  .text('Manage NFTs', async (ctx) => {
    ctx.session.step = 'nft-menu';
    await nftHome(ctx);
  })
  //await ctx.reply('This feature will be implemented soon, please follow <a href="https://twitter.com/aldrin_labs">@aldrin_labs</a> to stay tunes', {parse_mode: "HTML", link_preview_options: {is_disabled: true},
  //reply_markup: nft_menu})})
  //.text("Refer friends", (ctx) => ctx.menu.nav("refer-menu"))
  //.text("Alerts", (ctx) => ctx.menu.nav("alerts-menu")).row()
  .text('Wallet', async (ctx) => {
    ctx.session.step = 'wallet';
    ctx.menu.nav('wallet-menu');
  })
  .row()
  .text('Pools', async (ctx) => {
    ctx.menu.nav('sui-pools');
  })
  .text('Create Coin', async (ctx) => {
    await ctx.conversation.enter('createCoin');
  })
  .row()
  .text('DCA', async (ctx) => {
    ctx.menu.nav('sui-dca');
  })
  .text('Slippage', async (ctx) => {
    await showSlippageConfiguration(ctx);
  })
  .row()
  .text('Launchpad', (ctx) => {
    ctx.menu.nav('launchpad');
  })
  .row()
  .text('User Agreement', async (ctx) => {
    await ctx.reply(
      '<b>Beta Version Software Disclaimer:</b>\nThis software is provided as a beta version and is currently under testing. Aldrin Labs grants you access to this software on an "as is" and "as available" basis, and you are voluntarily participating in its testing.\n<b>Limitation of Liability</b>\nAldrin Labs expressly disclaims any warranty for this software. The software and any related documentation is provided "as is" without warranty of any kind, either expressed or implied, including, without limitation, the implied warranties or merchantability, fitness for a particular purpose, or non-infringement. The entire risk arising out of use or performance of the software remains with you.\n<b>No Liability for Damages</b>\nIn no event shall Aldrin Labs or its affiliates, or any of its directors, employees, or other representatives be liable for any damages whatsoever (including, without limitation, damages for loss of business profits, business interruption, loss of business information, or other pecuniary loss) arising out of the use of or inability to use this beta version software, even if Aldrin Labs has been advised of the possibility of such damages.\n<b>Feedback and Reporting</b>\nAs a beta tester, you are encouraged to provide feedback, suggestions, and report any bugs or issues you encounter. Your feedback is valuable to us and will be used to improve the final release of the software. However, please note that we are under no obligation to provide you with technical support unless specified otherwise.\n<b>Agreement</b>\nBy using this beta version software, you agree to the terms of this disclaimer. If you do not agree with these terms, you are not authorized to use or access this software.',
      { parse_mode: 'HTML', reply_markup: goHome },
    );
  })
  .url('Buy $RIN token', 'https://jup.ag/swap/USDC-RIN')
  .row()
  .text('Aldrin Bridge')
  .dynamic((ctx: BotContext, range: MenuRange<BotContext>) => {
    const {
      isUserEligibleToGetBonus,
      isUserAgreeWithBonus,
      isUserClaimedBonus,
    } = ctx.session.welcomeBonus;

    if (
      isUserEligibleToGetBonus &&
      !isUserClaimedBonus &&
      (isUserAgreeWithBonus === null || isUserAgreeWithBonus === true)
    ) {
      if (ENABLE_WELCOME_BONUS)
        range.row().text('Claim Free SUI', async (ctx: BotContext) => {
          await ctx.conversation.enter(ConversationId.WelcomeBonus);
        });
    }
  });

menu.register(buy_menu);
menu.register(nft_menu);
menu.register(nft_exit_menu);
menu.register(positions_menu);
menu.register(help_menu);
menu.register(refer_menu);
menu.register(alerts_menu);
menu.register(wallet_menu);
menu.register(settings_menu);
menu.register(deposit_menu, 'wallet-menu');
menu.register(withdraw_menu, 'wallet-menu');
menu.register(poolsMenu);
menu.register(dcaMenu);
menu.register(activeDcas);
menu.register(launchpadMenu);

export default menu;
