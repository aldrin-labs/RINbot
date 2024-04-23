import { b, c, ib } from '../../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../../types';

export const stablecoinArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Stablecoin',
  callbackQueryData: OnboardingCallbackQueryData.Stablecoin,
  text:
    `💵 ${ib('Stablecoin')} usually represents the global market currency, e.g. ${b('USD')}, ` +
    `${b('EUR')}, etc.\n\nThe most popular ${ib('stablecoin')} examples are ${b('USDC')} ` +
    `and ${b('USDT')}.\n${c('1')} ${b('USDC')}, like ${c('1')} ${b('USDT')}, represents ${b('$1')}, ` +
    `meaning ${c('1')} ${b('USDC')} (and ${c('1')} ${b('USDT')}) ` +
    `has a constant ${b('$1')} price. Generally, all the ${ib('coins')} in the crypto world have their ` +
    `price in ${b('USDC')}/${b('USDT')}.`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.VolatileCoin,
};
