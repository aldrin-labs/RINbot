import { b, ib } from '../../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../../types';

export const buyAtSellAndManageArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Increase Position',
  callbackQueryData: OnboardingCallbackQueryData.IncreasePosition,
  text:
    `💸 The ${ib('Sell & Manage')} page offers you one more feature – ` +
    `if you want to increase your ${ib('position')}, meaning ${ib('buy')} more selected ${ib('coins')}, you can ` +
    `choose, as for ${ib('selling')}, either a predefined amount, or choose ${ib('Buy X SUI')} and enter the ` +
    `amount of ${b('SUI')} you want to spend manually.\n\nPretty simple, let's explore further! 😉`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.CreateCoin,
};
