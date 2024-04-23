import { b, c, ib } from '../../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../../types';

export const sellArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Sell',
  callbackQueryData: OnboardingCallbackQueryData.Sell,
  text:
    `💰 If you want to ${ib('sell')} something, just choose the ${ib('position')} you want to work with at the ` +
    `${ib('Sell & Manage')} page, and how much percent of the current amount you want to ${ib('sell')}.\n\nShortcut ` +
    `buttons are ${c('25%')} and ${c('100%')}, but you can just click on the ${ib('Sell X%')} button and enter, ` +
    `how much percent you want to ${ib('sell')}.\n\nAfter choosing the percentage (either by button or manually), ` +
    `you will be notified about the selling amount and how much ${b('SUI')} you will receive.\nAs for ` +
    `${ib('buying')}, you can either confirm or cancel the swap.`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.IncreasePosition,
};
