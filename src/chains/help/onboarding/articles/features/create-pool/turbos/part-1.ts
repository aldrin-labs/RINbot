import { b, ib } from '../../../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../../../types';

export const createTurbosPoolPart1Article: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Part 1',
  callbackQueryData: OnboardingCallbackQueryData.CreateTurbosPoolPart1,
  text:
    `💰 📈 And here we go: ${b('Turbos')} concentrated ${ib('liquidity pool creation')}!\n\nLet's start the creation ` +
    `process: ${ib('Launchpad')} —> ${ib('Pools')} —> ${ib('Create Turbos Pool')}.\n\nFirstly, you need to know, ` +
    `what ${ib('2 coins')} you want to create the pool with.\n\n🚥 There is an honest recommendation: use ` +
    `${b('SUI')} as the ${ib('second coin')} in the pool. ${b('Turbos')}, like any other provider, has some ` +
    `unrecognized restrictions on the pool creation process, so with ${b('SUI')} as the ${ib('second coin')} ` +
    `there is much less chance, that your pool creation will be failed.\n\nAfter entering ${ib('types')} or ` +
    `Suiscan links of both ${ib('coins')}, you need to choose a ${ib('tick spacing')} of your pool.\n\n`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.CreateTurbosPoolPart2,
  videoUrl: 'https://fastupload.io/kxkuLd2eDlyd/XnyRu92QOFI3jJA/5pVzNR5Kkz7wv/create-turbos-pool.mp4',
};
