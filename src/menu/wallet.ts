import { Menu } from '@grammyjs/menu';
import { getExplorerLink } from '../chains/sui.functions';
import { BotContext } from '../types';

const wallet_menu = new Menu<BotContext>('wallet-menu')
  .dynamic(async (ctx, range) => {
    range.url('View in explorer', getExplorerLink(ctx));
  })
  .back('Home', (ctx) => {
    ctx.session.step = 'main';
  })
  .row()
  .text('Deposit', async (ctx) => {
    await ctx.reply(
      `Your public key is: <code>${ctx.session.publicKey}</code>`,
      {
        parse_mode: 'HTML',
      },
    );
  })
  .text('Withdraw X amount', async (ctx: any) => {
    ctx.session.step = 'wallet-withdraw';
    await ctx.conversation.enter('withdraw');
  })
  .row()
  .text('Export private key', async (ctx: BotContext) => {
    await ctx.conversation.enter('exportPrivateKey');
  })
  .row();

export default wallet_menu;
