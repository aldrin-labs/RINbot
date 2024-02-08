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
import withdraw_menu from './wallet_withdraw';
import SuiApiSingleton from '../chains/sui';
import { assets } from '../chains/sui.functions';

// const getOverview = async () => {
//   let overview = `Position Overview:\n\n`;
//   const sdk = await SuiApiSingleton.getInstance();
//   const assets = sdk.
//   // for (let i = 0; i < walletData.tokens.length; i++) {
//   //   overview += `/${i + 1} *[${walletData.tokens[i].coinTicker}](https://dexscreener.com/sui/${walletData.tokens[i].coinAddress})*\nValue: *${walletData.tokens[i].balance}*\nMcap:\n\n`;
//   // }
//   // return overview;
// };

// Create a simple menu.
const menu = new Menu<BotContext>('main')
  .text('Buy', async (ctx) => {
    ctx.session.step = 'buy';
    ctx.menu.nav('buy-menu');
    await ctx.conversation.enter('buy');
  })
  .text('Sell & Manage', async (ctx) => {
    ctx.session.step = 'positions';
    // const sdk = (await SuiApiSingleton.getInstance()).getApi();
    // await sdk.assets(ctx);

    await assets(ctx)
    //ctx.menu.nav('positions-menu');
  })
  .row()
  .text('User Agreement', async (ctx) => {
    await ctx.reply('<b>Beta Version Software Disclaimer:</b>\nThis software is provided as a beta version and is currently under testing. Aldrin Labs grants you access to this software on an "as is" and "as available" basis, and you are voluntarily participating in its testing.\n<b>Limitation of Liability</b>\nAldrin Labs expressly disclaims any warranty for this software. The software and any related documentation is provided "as is" without warranty of any kind, either expressed or implied, including, without limitation, the implied warranties or merchantability, fitness for a particular purpose, or non-infringement. The entire risk arising out of use or performance of the software remains with you.\n<b>No Liability for Damages</b>\nIn no event shall Aldrin Labs or its affiliates, or any of its directors, employees, or other representatives be liable for any damages whatsoever (including, without limitation, damages for loss of business profits, business interruption, loss of business information, or other pecuniary loss) arising out of the use of or inability to use this beta version software, even if Aldrin Labs has been advised of the possibility of such damages.\n<b>Feedback and Reporting</b>\nAs a beta tester, you are encouraged to provide feedback, suggestions, and report any bugs or issues you encounter. Your feedback is valuable to us and will be used to improve the final release of the software. However, please note that we are under no obligation to provide you with technical support unless specified otherwise.\n<b>Agreement</b>\nBy using this beta version software, you agree to the terms of this disclaimer. If you do not agree with these terms, you are not authorized to use or access this software.',
    {parse_mode: 'HTML'})
    ctx.menu.nav('help-menu')
  })
  //.text("Refer friends", (ctx) => ctx.menu.nav("refer-menu"))
  //.text("Alerts", (ctx) => ctx.menu.nav("alerts-menu")).row()
  .text('Wallet', async (ctx) => {
    ctx.session.step = 'wallet';
    ctx.menu.nav('wallet-menu');
  })
  .row()
  .url('Buy $RIN token', 'https://jup.ag/swap/USDC-RIN');


//.text("Settings", (ctx) => ctx.menu.nav("settings-menu")).row();

menu.register(buy_menu);
menu.register(positions_menu);
menu.register(help_menu);
menu.register(refer_menu);
menu.register(alerts_menu);
menu.register(wallet_menu);
menu.register(settings_menu);
menu.register(deposit_menu, 'wallet-menu');
menu.register(withdraw_menu, 'wallet-menu');

export default menu;
