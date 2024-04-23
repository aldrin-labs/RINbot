import letsGoKeyboard from '../../../../inline-keyboards/help/onboarding/lets-go';
import noThanksKeyboard from '../../../../inline-keyboards/help/onboarding/no-thanks';
import { getTwoButtonsInRow } from '../../../../inline-keyboards/utils';
import { BotContext } from '../../../../types';

export async function showWelcomeOnboardingPage(ctx: BotContext) {
  const keyboard = getTwoButtonsInRow(letsGoKeyboard, noThanksKeyboard);

  await ctx.reply('<b>Welcome to RINbot on Sui Network!</b>\n\nDo you wanna proceed with our great onboarding?', {
    reply_markup: keyboard,
    parse_mode: 'HTML',
  });
}
