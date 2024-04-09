import { isValidSuiAddress } from '@avernikoz/rinbot-sui-sdk';
import goHome from '../../../inline-keyboards/goHome';
import confirmWithCloseKeyboard from '../../../inline-keyboards/mixed/confirm-with-close';
import { BotContext, MyConversation } from '../../../types';
import { CallbackQueryData } from '../../../types/callback-queries-data';

export async function initializeAccount(conversation: MyConversation, ctx: BotContext) {
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

  // TODO: Create, sign & execute transaction for account creation and handle result
  console.debug('addressToWithdraw:', addressToWithdraw);

  conversation.session.account = 'some_account';

  await ctx.reply('Your account is <b>successfully created</b>!', { reply_markup: goHome, parse_mode: 'HTML' });

  return;
}
