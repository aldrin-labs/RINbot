import { Menu, MenuRange } from '@grammyjs/menu';
import { ConversationId } from '../chains/conversations.config';
import { showRefundsPage } from '../chains/refunds/showRefundsPage';
import { assets, nftHome } from '../chains/sui.functions';
import { ENABLE_WELCOME_BONUS } from '../config/bot.config';
import { BotContext } from '../types';
import feesMenu from './fees';
import launchpadMenu from './launchpad/launchpad';
import { nftExitMenu, nftMenu } from './nft';
import poolsMenu from './pools';
import positionsMenu from './positions';
import refundsMenu from './refunds';
import settingsMenu from './settings';
import walletMenu from './wallet';

const menu = new Menu<BotContext>('main')
  .text('Buy', async (ctx) => {
    ctx.session.tradeCoin = {
      coinType: '',
      tradeAmountPercentage: '0',
      useSpecifiedCoin: false,
    };
    await ctx.conversation.enter('buy');
  })
  .text('Sell & Manage', async (ctx) => {
    await assets(ctx);
  })
  .row()
  .text('Manage NFTs', async (ctx) => {
    await nftHome(ctx);
  })
  .text('Wallet', async (ctx) => {
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
    const { isUserEligibleToGetBonus, isUserAgreeWithBonus, isUserClaimedBonus } = ctx.session.welcomeBonus;

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

menu.register(nftMenu);
menu.register(nftExitMenu);
menu.register(positionsMenu);
menu.register(walletMenu);
menu.register(settingsMenu);
menu.register(poolsMenu);
menu.register(launchpadMenu);
menu.register(feesMenu);
menu.register(refundsMenu);

export default menu;
