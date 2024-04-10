import { AccountAbstractionManager, isValidSuiAddress } from '@avernikoz/rinbot-sui-sdk';
import goHome from '../../../inline-keyboards/goHome';
import confirmWithCloseKeyboard from '../../../inline-keyboards/mixed/confirm-with-close';
import { retryAndGoHomeButtonsData } from '../../../inline-keyboards/retryConversationButtonsFactory';
import { BotContext, MyConversation } from '../../../types';
import { CallbackQueryData } from '../../../types/callback-queries-data';
import { ConversationId } from '../../conversations.config';
import { getTransactionFromMethod, signAndExecuteTransaction } from '../../conversations.utils';
import { TransactionResultStatus } from '../../sui.functions';
import { getSuiVisionTransactionLink } from '../../utils';

export async function initializeAccount(conversation: MyConversation, ctx: BotContext) {
  const retryButton = retryAndGoHomeButtonsData[ConversationId.InitializeAccount];

  await ctx.reply(
    'Please, enter the address to which your account will be able to withdraw funds.\n\n' +
      '<b>Example</b>: <code>0x0aca2a52083bd23b09cf8efe2c9b84903d04a46dba6c6f78b4ef06f8bbec1082</code>',
    { parse_mode: 'HTML' },
  );

  let userFinishedAddressesAddition = false;
  let addressToWithdraw: string | undefined;

  do {
    const addressContext = await conversation.waitFor('message:text');
    const address = addressContext.msg.text;

    const addressIsValid = isValidSuiAddress(address);

    if (!addressIsValid) {
      await ctx.reply('Entered address is not valid. Please, specify a valid one.');

      continue;
    }

    await ctx.reply(`You are about to save <code>${address}</code> as the <b>withdraw address</b>.`, {
      reply_markup: confirmWithCloseKeyboard,
      parse_mode: 'HTML',
    });

    const confirmContext = await conversation.waitFor('callback_query:data');
    const confirmCallbackQueryData = confirmContext.callbackQuery.data;

    if (
      confirmCallbackQueryData === CallbackQueryData.Cancel ||
      confirmCallbackQueryData !== CallbackQueryData.Confirm
    ) {
      await confirmContext.answerCallbackQuery();
      await ctx.reply('Please, enter another <b>withdraw address</b>.', { parse_mode: 'HTML' });

      continue;
    }

    addressToWithdraw = address;
    userFinishedAddressesAddition = true;

    await confirmContext.answerCallbackQuery();
    break;
  } while (!userFinishedAddressesAddition);

  if (addressToWithdraw === undefined) {
    await ctx.reply('Cannot process entered <b>withdraw address</b>. Please, try again or contact support.', {
      reply_markup: retryButton,
      parse_mode: 'HTML',
    });

    return;
  }

  const transaction = await getTransactionFromMethod({
    conversation,
    ctx,
    method: AccountAbstractionManager.getCreateNewAccountTransaction,
    // TODO: Make sure `owner` is `addressToWithdraw`
    params: { owner: addressToWithdraw },
  });

  if (transaction === undefined) {
    await ctx.reply('Failed to create transaction for account creation. Please, try again or contact support.', {
      reply_markup: retryButton,
    });

    return;
  }

  // TODO: Who should be the `signerPrivateKey`?
  const result = await signAndExecuteTransaction({ conversation, ctx, transaction, signerPrivateKey: '' });

  if (result.result === TransactionResultStatus.Success && result.digest !== undefined) {
    // TODO: Where to fetch created account from?
    conversation.session.account = 'some_account';

    await ctx.reply(
      `Your account is <a href="${getSuiVisionTransactionLink(result.digest)}">successfully created</a>!`,
      { reply_markup: goHome, parse_mode: 'HTML', link_preview_options: { is_disabled: true } },
    );

    return;
  }

  if (result.result === TransactionResultStatus.Failure && result.digest !== undefined) {
    await ctx.reply(`<a href="${getSuiVisionTransactionLink(result.digest)}">Failed</a> to create account.`, {
      reply_markup: retryButton,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });

    return;
  }

  await ctx.reply(`<b>Failed</b> to create account.`, {
    reply_markup: retryButton,
    parse_mode: 'HTML',
  });

  return;
}
