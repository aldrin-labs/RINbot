import { b, c, ib } from '../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../types';

export const availableSuiBalanceArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Available SUI Balance',
  callbackQueryData: OnboardingCallbackQueryData.AvailableSuiBalance,
  text:
    `✏ On the home page, you will see your full and ${ib('available SUI balance')}. Can't you use your ` +
    `full deposited ${b('SUI')} balance?\n\nSure you can, we do not have any commission on both ${ib('deposit')} ` +
    `& ${ib('withdraw')} (we'll show how to make them further).\n\nAll the thing is, each transaction you send in ` +
    `the ${b('SUI')} blockchain will cost some gas, like in any other blockchain.\n\nBecause of that we just book ` +
    `${c('0.05')} ${b('SUI')} on your wallet for gas payments, so you can easily spend your ${ib('available SUI')} ` +
    `e.g. in trade without thinking about how much ${b('SUI')} should you leave for gas payments.`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.LiquidityProviders,
};
