import { c, ib } from '../../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../../types';

export const slippagePart1Article: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Part 1',
  callbackQueryData: OnboardingCallbackQueryData.SlippagePart1,
  text:
    `✏🗺 ${ib('Slippage')} is a setting used throughout the whole crypto world when you want to ${ib('buy')} or ` +
    `${ib('sell')} any ${ib('coin')}, regardless of the blockchain. So, what does it mean?\n\n${ib('Slippage')} ` +
    `is the acceptable difference between the ${ib('amount you expect to receive')} and the ` +
    `${ib('amount you receive')} through a swap.\n\nAll the thing is, that a price of an asset you want to ` +
    `${ib('buy')} or ${ib('sell')} can change very frequently, like each ${c('500ms')} or even less. The price ` +
    `change causes the receiving amount to change: ${ib('the higher the price, the less you receive')}, and vice ` +
    `versa.\n\nAnd when you set your ${ib('slippage')}, for example, at ${c('5%')}, that means you say «I agree to ` +
    `receive ${c('5%')} less or ${c('5%')} more of the amount of ${ib('coins')} that I ` +
    `${ib('expect to receive')}».`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.SlippagePart2,
  videoUrl: 'https://fastupload.io/i72qX8aYZ2N2/fjgYwLSMhjfuWaC/Pbe3PZlNeGlX6/slippage.mp4',
};
