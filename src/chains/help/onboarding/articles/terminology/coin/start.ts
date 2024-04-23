import { b, ib } from '../../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../../types';

export const coinStartArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Introduction',
  callbackQueryData: OnboardingCallbackQueryData.CoinStart,
  text:
    `🪙 Alright, and what is the ${ib('coin')}?\n\n— ${ib('Coin')} is just a currency in the ` +
    `${b('SUI')} blockchain. ` +
    `Like at the global market, there are ${b('CNY')}, ${b('EUR')}, etc., which all have their price ` +
    `in ${b('USD')} ` +
    `(or in any other currency) – the same way at the ${b('SUI')} blockchain there are various ` +
    `${ib('coins')}, which have ` +
    `their price in ${b('USD')} or any other ${ib('coin')}.\n\nThere are 2 kinds of ${ib('coins')}:\n` +
    `1. ${ib('Stablecoin')}\n2. ${ib('Volatile')} (not stable) ${ib('coin')}`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.Stablecoin,
};
