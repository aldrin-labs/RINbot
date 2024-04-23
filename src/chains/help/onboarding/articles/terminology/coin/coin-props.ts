import { b, c, ib } from '../../../../../../text-formatting/formats';
import { RINCEL_COIN_TYPE } from '../../../../../sui.config';
import { OnboardingCallbackQueryData } from '../../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../../types';

export const coinPropsArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Coin Properties',
  callbackQueryData: OnboardingCallbackQueryData.CoinProps,
  text:
    `✏ Ok, and what do mean all these words: ${ib('coin type')}, ${ib('coin decimals')}, ${ib('coin symbol')}?\n\n` +
    `— ${ib('Coin')} always has its ${ib('type')} and ${ib('decimals')}. ${ib('Symbol')} is not always defined ` +
    `though.\n\nThe ${ib('coin type')} is just like a unique coin ID. If you want to specify, what ` +
    `${ib('coin')} you want to buy, the best way is to provide its ${ib('coin type')}.\n\nExample of ` +
    `${ib('coin type')} for ${b('RINCEL')} coin:\n${c(RINCEL_COIN_TYPE)}\n\nLike all the ` +
    `addresses in the ${b('SUI')} blockchain, all the ${ib('coin types')} start with ${c('0x')} part.`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.CoinSymbol,
};
