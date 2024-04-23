import { b, c, ib } from '../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../types';

export const priceDifferenceThresholdArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Price Difference Threshold',
  callbackQueryData: OnboardingCallbackQueryData.PriceDifferenceThreshold,
  text:
    `⚙️ We are coming to complete our ${b('RINsui_bot')} ${ib('settings')} adventure, and now we are going ` +
    `to explore ` +
    `(drum roll 🥁)… Yes, a ${ib('Price Difference Threshold')}!\n\nThis feature just warns you in the swap ` +
    `information message, when a price of a ${ib('coin')} you are going to buy or sell is ` +
    `${ib('not fair')}.\nBut what means ${ib('not fair')}? Everything is simple, as usual 😎\n\n📊 There are some ` +
    `platforms like ${b('CoinMarketCap')}, ${b('CoinGecko')}, or ${b('DexScreener')}, which can give you pretty ` +
    `reliable information about the price of a particular ${ib('coin')}.\nIn the meantime, it's not hard to ` +
    `calculate the price of a particular ${ib('coin')} with the help of the swap data: ${ib('how much you pay')} ` +
    `and ${ib('how much you receive')}.\n\nSo when you make the swap, we differ these two prices: ` +
    `${ib('from the reliable platform')} and ${ib('calculated from the swap')}. And when the difference between them ` +
    `is more than your ${ib('price difference threshold')}, which is ${c('5%')} by default, we warn you with the ` +
    `${ib('rate warning')}.\n\n` +
    // This part is commented until feature from this text is not implemented
    // `Also, when the ${ib('swap confirmation')} is ${ib('disabled')} (so the swaps auto-confirm), and the ` +
    // `${ib('rate warning')} occurs, we ask you to either confirm or cancel this particular swap for your safety. ` +
    // `And that's it!\n\n` +
    `You can change your ${ib('price difference threshold')} at any time in ${ib('Settings')} —> ` +
    `${ib('Price Difference Threshold')} 😉`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.CoinWhitelist,
  videoUrl: 'https://fastupload.io/B9WBc9tFqS1F/wHnMx0nsL44d9mf/qLQ36YQEQm19j/price-difference-threshold.mp4',
};
