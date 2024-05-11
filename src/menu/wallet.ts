import { Menu } from '@grammyjs/menu';
import { CommonConversationId } from '../chains/conversations.config';
import { getExplorerLink } from '../chains/sui.functions';
import { enterConversation } from '../middleware/conversations/utils';
import { BotContext } from '../types';

const walletMenu = new Menu<BotContext>('wallet-menu')
  .dynamic(async (ctx, range) => {
    range.url('View in explorer', getExplorerLink(ctx));
  })
  .back('Home')
  .row()
  .text('Deposit', async (ctx) => {
    await ctx.reply(`Your public key is: <code>${ctx.session.publicKey}</code>`, {
      parse_mode: 'HTML',
    });
  })
  .text('Withdraw X amount', async (ctx) => {
    await enterConversation({ ctx, conversationId: CommonConversationId.Withdraw });
  })
  .row()
  .text('Export Private Key', async (ctx) => {
    await enterConversation({ ctx, conversationId: CommonConversationId.ExportPrivateKey });
  })
  // .text('Import New Wallet', async (ctx) => {
  //   await enterConversation({ ctx, conversationId: CommonConversationId.ImportNewWallet });
  // })
  .row();

export default walletMenu;
