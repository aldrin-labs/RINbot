import closeConversation from '../../../inline-keyboards/closeConversation';
import goHome from '../../../inline-keyboards/goHome';
import { retryAndGoHomeButtonsData } from '../../../inline-keyboards/retryConversationButtonsFactory';
import { BotContext, MyConversation } from '../../../types';
import { ConversationId } from '../../conversations.config';
import { getPrivateKeyString, userIsNotEligibleToExportPrivateKey } from '../utils';

export async function exportPrivateKey(conversation: MyConversation, ctx: BotContext): Promise<void> {
  if (await userIsNotEligibleToExportPrivateKey(ctx)) {
    return;
  }

  await ctx.reply(`Are you sure want to export private key? Please type <code>CONFIRM</code> if yes.`, {
    reply_markup: closeConversation,
    parse_mode: 'HTML',
  });

  const retryButton = retryAndGoHomeButtonsData[ConversationId.ExportPrivateKey];
  const messageData = await conversation.waitFor(':text');
  const isExportConfirmed = messageData.msg.text === 'CONFIRM';

  if (!isExportConfirmed) {
    await ctx.reply(`You've not typed CONFIRM. Ignoring your request of exporting private key.`, {
      reply_markup: retryButton,
    });

    return;
  }

  const privateKeyString = getPrivateKeyString(ctx);

  await ctx.reply(privateKeyString, {
    parse_mode: 'HTML',
    reply_markup: goHome,
  });
}
