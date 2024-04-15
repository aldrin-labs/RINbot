import goHome from '../../../inline-keyboards/goHome';
import disableSwapConfirmationKeyboard from '../../../inline-keyboards/settings/swap-confirmation/disable-confirmation';
import enableSwapConfirmationKeyboard from '../../../inline-keyboards/settings/swap-confirmation/enable-confirmation';
import { BotContext } from '../../../types';

export async function showSwapConfirmationPage(ctx: BotContext) {
  const swapWithConfirmation = ctx.session.settings.swapWithConfirmation;
  const swapConfirmationState = swapWithConfirmation ? 'On' : 'Off';

  const keyboard = swapWithConfirmation ? disableSwapConfirmationKeyboard : enableSwapConfirmationKeyboard;
  const homeButtons = goHome.inline_keyboard[0];
  const keyboardWithHome = keyboard
    .clone()
    .row()
    .add(...homeButtons);

  await ctx.reply(
    `${swapWithConfirmation ? '✅' : '❌'}  <b>Swap Confirmation</b>: <i><b>${swapConfirmationState}</b></i>\n\n` +
      `✏  <b>Know Before You Swap</b>\n\n` +
      `With Swap Confirmation enabled, you can review the approximate output tokens for a given route ` +
      `before finalizing a swap. After specifying the token you want to buy and the amount you're willing ` +
      `to trade, you'll have the option to either confirm or cancel the trade.\n\n` +
      `Enabling this feature empowers you to trade with confidence, allowing you to make informed decisions ` +
      `based on the projected outcome of your swaps. Disable Swap Confirmation to streamline your trading ` +
      `experience and execute trades more swiftly.`,
    {
      reply_markup: keyboardWithHome,
      parse_mode: 'HTML',
    },
  );
}
