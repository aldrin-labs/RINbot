import { b, c, ib } from '../../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../../types';

export const slippagePart2Article: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Part 2',
  callbackQueryData: OnboardingCallbackQueryData.SlippagePart2,
  text:
    `✏📋 So, let's imagine you want to buy ${b('1 SUI')}, and the ${b('SUI')} price at ` +
    `the moment is ${b('1 USDC')}, so you ${ib('expect')} to spend ${b('1 USDC')} and receive ${b('1 SUI')}.\n\n` +
    `💣💥 ${b('But boom!')} Right before your transaction someone bought a giant amount of ${b('SUI')} and boosted its ` +
    `price to ${b('1.5 USDC')} per ${b('SUI')}.\n\nSo now, spending ${b('1 USDC')}, you can receive only ` +
    `${b('0.67 SUI')}, and that's a ${c('33%')} difference between ${ib('what you expect')} (${b('1 SUI')}) and ` +
    `${ib('what you receive')} (${b('0.67 SUI')}).\n\nThus, if your ${ib('slippage')} is set to ${c('33%')} or more, ` +
    `your transaction most likely will be successfully executed, because ` +
    `${ib(`you agree to receive ${c('33%')} less than you expect to receive`)}.\n\nHowever, if your ` +
    `${ib('slippage')}, for example, is set to ${c('5%')}, the minimum amount you agree to receive in such a case is ` +
    `${b('0.95 SUI')}, because the difference between ${b('1 SUI')} and ${b('0.95 SUI')} is exactly ${c('5%')}.`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.SlippagePart3,
};
