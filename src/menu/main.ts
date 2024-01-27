import { BotContext } from '../types';
import { Menu } from '@grammyjs/menu';

import buy_menu from './buy';
import positions_menu from './positions';
import help_menu from './help';
import refer_menu from './refer';
import alerts_menu from './alerts';
import wallet_menu from './wallet';
import settings_menu from './settings';
import deposit_menu from './wallet_deposit';

const buy_text = 'Buy Token: \n\nTo buy a token enter a token address';

//Mock data
import { walletData } from '../mock/wallet';

// Create a simple menu.
const menu = new Menu<BotContext>('main')
  .text('Buy', async (ctx: any) => {
    ctx.session.step = 'buy';
    ctx.menu.nav('buy-menu');
    ctx.conversation.enter('buy');
  })
  .text('Sell & Manage', async (ctx: any) => {
    ctx.session.step = 'positions';
    ctx.reply(
      `${walletData.tokens[0].coinName} | ${walletData.tokens[0].coinTicker} | 
    ${walletData.tokens[0].coinAddress}
    `,

      { reply_markup: positions_menu },
    );
    //ctx.menu.nav('positions-menu');
  })
  .row()
  .text('Help', (ctx) => ctx.menu.nav('help-menu'))
  //.text("Refer friends", (ctx) => ctx.menu.nav("refer-menu"))
  //.text("Alerts", (ctx) => ctx.menu.nav("alerts-menu")).row()
  .text('Wallet', async (ctx: any) => {
    ctx.session.step = 'wallet';
    ctx.menu.nav('wallet-menu');
  });
//.text("Settings", (ctx) => ctx.menu.nav("settings-menu")).row();

menu.register(buy_menu);
menu.register(positions_menu);
menu.register(help_menu);
menu.register(refer_menu);
menu.register(alerts_menu);
menu.register(wallet_menu);
menu.register(settings_menu);
menu.register(deposit_menu, 'wallet-menu');

export default menu;
