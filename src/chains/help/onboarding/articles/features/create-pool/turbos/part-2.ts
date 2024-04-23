import { b, ib } from '../../../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../../../types';

export const createTurbosPoolPart2Article: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Part 2',
  callbackQueryData: OnboardingCallbackQueryData.CreateTurbosPoolPart2,
  text:
    `❔ «Stop, but what does the ${ib('tick spacing')} mean?» – will ask you.\n«${ib('Tick spacing')} is just ` +
    `a number, which will affect the price precision. Also, and this is more important, each ${ib('tick spacing')} ` +
    `corresponds different ${ib('fee rate')}», – will answer we.\n\nSo, mainly, you just choose, what ` +
    `${ib('fee rate')} will have your pool. As usual, nothing complicated 😊\n\nAfter that the ${b('RINsui_bot')} ` +
    `will check, whether the pool with such ${ib('coins')} and ${ib('fee rates')} already exists.\nIf yes, you will ` +
    `have to change the ${ib('coin(s)')} or ${ib('tick spacing')} and try again.`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.CreateTurbosPoolPart3,
  videoUrl: 'https://fastupload.io/kxkuLd2eDlyd/XnyRu92QOFI3jJA/5pVzNR5Kkz7wv/create-turbos-pool.mp4',
};
