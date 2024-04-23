import { b, ib, s, u } from '../../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../../types';

export const coinSymbolArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Coin Symbol',
  callbackQueryData: OnboardingCallbackQueryData.CoinSymbol,
  text:
    `✏ The ${ib('coin symbol')} is the short representation of the ${ib('coin')}. In the example ` +
    `above the ${ib('coin symbol')} is ${b('RINCEL')}.\n\nBut why do we need this strange and long ` +
    `${ib('coin type')}, if we have such a beautiful and short ${ib('coin symbol')}? All the thing is ` +
    `that ${ib('coin symbols')} are ${u('not unique')}. That means anyone can create another e.g. ${b('USDC')} or ` +
    `${b('USDT')} ${ib('coin')} (${s(`with the ${b('RINsui_bot')} you can create your ${ib('coin')} too`)}).\n\n` +
    `${s(`I'll tell you a secret: such duplicates of ${b('USDC')} and ${b('USDT')} ${ib('coins')} already exist!`)}`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.CoinDecimals,
};
