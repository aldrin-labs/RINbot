import { c, ib } from '../../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../../types';

export const slippagePart3Article: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Part 3',
  callbackQueryData: OnboardingCallbackQueryData.SlippagePart3,
  text:
    `✏ On the other side, you may ask: «But why can't I just set my ${ib('slippage')} to ${c('0')} and be sure ` +
    `that I never will receive less than I expect?». And the answer is – you can!\n\nThe only thing you should be ` +
    `aware of is that when you trade some ${ib('highly volatile coin')}, whose price is frequently changing, it will ` +
    `be really hard to receive a successful swap.\n\n— Why?\n— Because (you remember?) ` +
    `${ib('each price change causes the receiving amount to change')}.\n\nSo, when you say «I want exactly this ` +
    `amount», that means you say «I want exactly the price, corresponding to this amount».\nPrice changes frequently ` +
    `though, and that's the thing: you will try to catch some specific price when it is constantly changing.\n\n` +
    `Because of that we highly recommend setting your ${ib('slippage')} at more than ${c('0')}. However, the choice ` +
    `is always yours 😉`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.FeeSystem,
};
