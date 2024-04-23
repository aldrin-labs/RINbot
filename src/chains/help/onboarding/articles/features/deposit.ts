import { b, ib } from '../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../types';

export const depositArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Deposit',
  callbackQueryData: OnboardingCallbackQueryData.Deposit,
  text:
    `💶 Firstly, you may want to find out, how to ${ib('deposit')} on your ${b('RINsui_bot')} wallet.\n\n` +
    `So, that's pretty easy: all you need for ${ib('depositing')} is just your ${ib('public key')} and some ` +
    `amount of ${b('SUI')} on the other ${b('SUI')} account (it could be your other account, the account of ` +
    `your friend, your crypto exchange account, your cold storage account, and so on).\n\nJust send some ` +
    `${b('SUI')} to your ${b('RINsui_bot')} wallet using your ${ib('public key')} (watch the attached video ` +
    `for an illustrative example), and that's it!`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.ActivitiesWithDepositedFunds,
};
