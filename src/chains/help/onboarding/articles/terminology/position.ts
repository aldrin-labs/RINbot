import { b, c, ib } from '../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../types';

export const positionArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Position',
  callbackQueryData: OnboardingCallbackQueryData.Position,
  text:
    `💰 So, we are done with ${ib('coins')}. Now, what is the ${ib('position')}?\n\n— ${ib('Position')} in the ` +
    `${b('RINsui_bot')}, as in any other trading system, just means you own some amount of some asset. So, if ` +
    `you bought ${c('5000')} ${b('RINCEL')}, you have the ${ib('position')} in ${b('RINCEL')} with ${c('5000')} ` +
    `amount.`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.AvailableSuiBalance,
};
