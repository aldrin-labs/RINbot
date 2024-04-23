import { c, ib } from '../../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../../types';

export const coinDecimalsArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Coin Decimals',
  callbackQueryData: OnboardingCallbackQueryData.CoinDecimals,
  text:
    `✏ ${ib('Coin decimals')} are a bit about math, but nothing complicated. This is just a number, which means ` +
    `how many digits can be in the fractional part of a number.\n\nIt may sound so-so, but here is a simple example: ` +
    `how many ` +
    `digits can be in the fractional part of a dollar? Yeah, ${c('2')}!\nYou always have only ${c('2')} decimal ` +
    `places in any dollar amount, e.g. ${c('$123.45')}\nYou couldn't have something like ${c('$123.456')} ` +
    `(here ${ib('decimals')} are ${c('3')}), ` +
    `that's just invalid.\n\nIn the same way, each ${ib('coin')} in the blockchain has its ${ib('decimals')}, ` +
    `but usually, this number is greater than ${c('2')} (${c('9')} decimals is a default value), and that's it!`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.Position,
};
