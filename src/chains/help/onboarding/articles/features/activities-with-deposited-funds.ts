import { ib } from '../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../types';

export const activitiesWithDepositedFundsArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Activities With Funds',
  callbackQueryData: OnboardingCallbackQueryData.ActivitiesWithDepositedFunds,
  text:
    `✏ Ok, the funds are already in your account. What can you do with them?\n\nNow you can ${ib('trade coins')}` +
    `, ${ib('create your coin')}, and ${ib('create your pool')}! Also, ${ib('withdraw')}, but more on that later.\n\n` +
    `All these processes are described further, so let's go! 😉`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.Buy,
};
