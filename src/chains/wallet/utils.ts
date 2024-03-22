import { InlineKeyboard } from 'grammy';
import { WELCOME_BONUS_MIN_TRADES_LIMIT } from '../../config/bot.config';
import confirmWithCloseKeyboard from '../../inline-keyboards/mixed/confirm-with-close';
import goHome from '../../inline-keyboards/goHome';
import { BotContext, MyConversation } from '../../types';
import { CallbackQueryData } from '../../types/callback-queries-data';
import { reactOnUnexpectedBehaviour } from '../utils';

export async function userIsNotEligibleToExportPrivateKey(
  ctx: BotContext,
): Promise<boolean> {
  const {
    welcomeBonus: { isUserAgreeWithBonus, isUserClaimedBonus },
    tradesCount,
    refund: { claimedBoostedRefund },
  } = ctx.session;

  if (claimedBoostedRefund) {
    await ctx.reply(
      '👋 Just a quick heads-up: exporting private key is temporarily disabled because you opted for our boosted ' +
        'refund option. No worries, though! You can still use these funds and generate profits right here ' +
        'with us. Feel free to continue trading and utilizing other features 📈',
      { reply_markup: goHome },
    );

    return true;
  }

  const userIsNotEligibleToExportPrivateKey = !!(
    isUserAgreeWithBonus &&
    isUserClaimedBonus &&
    tradesCount < WELCOME_BONUS_MIN_TRADES_LIMIT
  );

  if (userIsNotEligibleToExportPrivateKey) {
    await ctx.reply(
      `🔐 Oops! It seems you're eager to export your private key. \nTo maintain the security of your assets ` +
        `and adhere to our bonus policy, you can only export your private key after completing ` +
        `${WELCOME_BONUS_MIN_TRADES_LIMIT} trades. \n\nKeep trading to unlock this feature and secure ` +
        `your gains! \nHappy trading! 📈`,
      { reply_markup: goHome },
    );
  }

  return userIsNotEligibleToExportPrivateKey;
}

export function getPrivateKeyString(ctx: BotContext) {
  return (
    `<b>Your private key is</b>: <span class="tg-spoiler">${ctx.session.privateKey}</span>\n\n` +
    `You can now i.e. import the key into a wallet like Suiet.\nDelete this message once you are done.`
  );
}

export async function warnWithCheckAndPrivateKeyPrinting({
  conversation,
  ctx,
  retryButton,
  warnMessage,
  operation,
}: {
  conversation: MyConversation;
  ctx: BotContext;
  retryButton: InlineKeyboard;
  warnMessage: string;
  operation: string;
}): Promise<boolean> {
  // Warning for user
  await ctx.reply(warnMessage, {
    reply_markup: confirmWithCloseKeyboard,
    parse_mode: 'HTML',
  });

  const confirmExportContext = await conversation.wait();
  const confirmExportCallbackQueryData =
    confirmExportContext.callbackQuery?.data;

  if (confirmExportCallbackQueryData === CallbackQueryData.Cancel) {
    await conversation.skip();
  } else if (confirmExportCallbackQueryData !== CallbackQueryData.Confirm) {
    await reactOnUnexpectedBehaviour(
      confirmExportContext,
      retryButton,
      operation,
    );
    return false;
  }
  await confirmExportContext.answerCallbackQuery();

  // Checking user is eligible to export private key
  if (await userIsNotEligibleToExportPrivateKey(ctx)) {
    return false;
  }

  // Printing user's private key
  const privateKeyString =
    '🔒 Ensure you have securely saved and backed up the private key of your current wallet ' +
    'before the import process.\n\n' +
    getPrivateKeyString(ctx);

  await ctx.reply(privateKeyString, { parse_mode: 'HTML' });

  return true;
}
