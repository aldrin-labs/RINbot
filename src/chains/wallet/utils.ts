import { WELCOME_BONUS_MIN_TRADES_LIMIT } from '../../config/bot.config';
import goHome from '../../inline-keyboards/goHome';
import { BotContext } from '../../types';

export async function userIsNotEligibleToExportPrivateKey(
  ctx: BotContext,
): Promise<boolean> {
  const {
    welcomeBonus: { isUserAgreeWithBonus, isUserClaimedBonus },
    tradesCount,
  } = ctx.session;

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
