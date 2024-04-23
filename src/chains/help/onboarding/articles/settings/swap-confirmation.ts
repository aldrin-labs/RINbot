import { ib } from '../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../types';

export const swapConfirmationArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Swap Confirmation',
  callbackQueryData: OnboardingCallbackQueryData.SwapConfirmation,
  text:
    `✅ Hey, how about ${ib('swap confirmation')}? That's a pretty useful feature, which allows you to fully control ` +
    `your swaps.\n\nIf the ${ib('swap confirmation')} is ${ib('enabled')} (it's ${ib('enabled')} by default), you ` +
    `will receive a message before the swap transaction execution with information about the swap: what and how ` +
    `many ${ib('coins')} you spend, what and how many ${ib('coins')} you will receive, and a ` +
    `${ib('liquidity provider')}, on whose pool the swap will be made.\nAt this point, you can just either confirm ` +
    `or cancel the swap. Amazing, isn't it? 😇\n\nOn the other side, if you want your swaps to be executed ` +
    `${ib('immediately')} and you are pretty confident about the amounts you will receive after the swap, you can ` +
    `just ${ib('disable')} the ${ib('confirmation')} in ${ib('Settings')} —> ${ib('Swap Confirmation')} (it can ` +
    `always be ${ib('enabled')} back). After that, you will just receive the message with the swap information, but ` +
    `there will be no need to confirm.\n\nThat's it! 😎`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.PriceDifferenceThreshold,
};
