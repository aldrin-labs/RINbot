import { b, ib } from '../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../types';

export const botFeaturesStartArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Introduction',
  callbackQueryData: OnboardingCallbackQueryData.BotFeaturesStart,
  text:
    `✅ Ok, we are done with the base terminology! Now let's go through the basic ${ib('features')} of the ` +
    `${b('RINsui_bot')}!\n\nFor each ${ib('feature')}, you will be able to use both a ${ib('text description')} ` +
    `and a ${ib('demonstration video')}.`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.Deposit,
};
