import { b, ib } from '../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../types';

export const withdrawArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Withdraw',
  callbackQueryData: OnboardingCallbackQueryData.Withdraw,
  text:
    `💳 Now we will find out how to ${ib('withdraw')} your funds.\n\nThat's pretty simple: first, you need to start ` +
    `the ${ib('withdrawal process')}: ${ib('Wallet')} —> ${ib('Withdraw X amount')}. There you will be asked to ` +
    `enter an address to which you'd like to send your ${b('SUI')}.\n\nAfter that, enter the amount of ${b('SUI')} ` +
    `you want to ${ib('withdraw')}, and that's it! You've successfully ${ib('withdrawed')} your funds!`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.ExportPrivateKey,
};
