import { a, b, ib } from '../../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../../types';

const suiDexScreenerLink =
  'https://dexscreener.com/sui/0x5eb2dfcdd1b15d2021328258f6d5ec081e9a0cdcfa9e13a0eaeb9b5f7505ca78';

export const volatileCoinArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Volatile Coin',
  callbackQueryData: OnboardingCallbackQueryData.VolatileCoin,
  text:
    `📈 📉 ${ib('Volatile')} (not stable) ${ib('coins')} are all the other ${ib('coins')}, ` +
    `which price can always be changed.\n\nThe most suitable example of a ${ib('volatile coin')} now ` +
    `is ${b('SUI')}! You can see, how ${b('SUI')} price changed, ${a('here', suiDexScreenerLink)}.\n\n` +
    `Like ${b('SUI')}, any other not ${ib('stablecoin')} has its price changes. By the way, the greater ` +
    `the change in price per unit of time (like per ${b('1 hour')} or ${b('day')}), the more ` +
    `${ib('volatile')} the ${ib('coin')} is considered.`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.CoinProps,
};
