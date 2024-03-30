import { Menu } from '@grammyjs/menu';
import { getExplorerLink } from '../chains/sui.functions';
import { BotContext } from '../types';
import { ConversationId } from '../chains/conversations.config';

const wallet_menu = new Menu<BotContext>('wallet-menu')
  .dynamic(async (ctx, range) => {
    range.url('View in explorer', getExplorerLink(ctx));
  })
  .back('Home')
  .row()
  .text('Deposit', async (ctx) => {
    await ctx.reply(
      `Your public key is: <code>${ctx.session.publicKey}</code>`,
      {
        parse_mode: 'HTML',
      },
    );
  })
  .text('Withdraw X amount', async (ctx) => {
    await ctx.conversation.enter(ConversationId.Withdraw);
  })
  .row()
  .text('Export Private Key', async (ctx) => {
    await ctx.conversation.enter(ConversationId.ExportPrivateKey);
  })
  // .text('Import New Wallet', async (ctx) => {
  //   await ctx.conversation.enter(ConversationId.ImportNewWallet);
  // })
  .row();

export default wallet_menu;
