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

  await ctx.reply(`Swap Confirmation: <i><b>${swapConfirmationState}</b></i>`, {
    reply_markup: keyboardWithHome,
    parse_mode: 'HTML',
  });
}
