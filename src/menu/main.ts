import { Menu, MenuRange } from '@grammyjs/menu';
import { ConversationId } from '../chains/conversations.config';
import { showRefundsPage } from '../chains/refunds/showRefundsPage';
import { assets, nftHome } from '../chains/sui.functions';
import { ENABLE_WELCOME_BONUS } from '../config/bot.config';
import { BotContext } from '../types';
import alerts_menu from './alerts';
import buy_menu from './buy';
import feesMenu from './fees';
import help_menu from './help';
import launchpadMenu from './launchpad/launchpad';
import { nft_exit_menu, nft_menu } from './nft';
import poolsMenu from './pools';
import positions_menu from './positions';
import refer_menu from './refer';
import refundsMenu from './refunds';
import settings_menu from './settings';
import wallet_menu from './wallet';
import deposit_menu from './wallet_deposit';
import withdraw_menu from './wallet_withdraw';

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
  .text('Wallet', async (ctx) => {
    ctx.session.step = 'wallet';
    ctx.menu.nav('wallet-menu');
  })
  .row()
  .text('Launchpad', (ctx) => {
    ctx.menu.nav('launchpad');
  })
  .text('Settings', (ctx) => {
    ctx.menu.nav('settings');
  })
  .row()
  .url('Buy $RIN token', 'https://jup.ag/swap/USDC-RIN')
  .text('Refunds', async (ctx) => {
    await showRefundsPage(ctx);
  })
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
menu.register(launchpadMenu);
menu.register(feesMenu);
menu.register(refundsMenu);

export default menu;
