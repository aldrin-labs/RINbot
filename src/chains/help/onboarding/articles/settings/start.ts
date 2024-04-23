import { b, ib } from '../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../types';

export const settingsStartArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Introduction',
  callbackQueryData: OnboardingCallbackQueryData.SettingsStart,
  text:
    `⚙️ Now it's time to explore, what are ${ib('settings')} in the ${b('RINsui_bot')}, and why you need them ` +
    `(or do not need 😊)\n\nFirst, you can open the ${ib('settings')} menu by pressing on ${ib('Settings')} button ` +
    `on the main page. And knowing that we will start with ${ib('slippage')}.`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.SlippagePart1,
};
