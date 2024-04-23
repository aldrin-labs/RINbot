import { b, ib } from '../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../types';

export const coinWhitelistArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Coin Whitelist',
  callbackQueryData: OnboardingCallbackQueryData.CoinWhitelist,
  text:
    `Ok, and the last thing about ${ib('settings')} in the ${b('RINsui_bot')} is a ${ib('Coin Whitelist')} 😎\n\n` +
    `${b('Disclaimer')}: if you are not a ${ib('boosted refund claimer')} and not a ${ib('welcome bonus claimer')}, ` +
    `you can safely skip this section.\n\n${ib('Coin whitelist')} is just a list of ${ib('coins')} you can trade ` +
    `when you ${ib('claimed the boosted refund')} or ${ib('welcome bonus')}. It contains the most liquid ` +
    `${ib('coins')} on ${b('SUI')} blockchain and is created to prevent a malicious behaviour.\n\nYou can have a ` +
    `look at it on ${ib('Settings')} —> ${ib('Coin Whitelist')}.`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.Conclusion,
};
