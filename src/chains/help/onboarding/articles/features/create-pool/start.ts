import { b, c, ib } from '../../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../../types';

export const createPoolStartArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Introduction',
  callbackQueryData: OnboardingCallbackQueryData.CreatePoolStart,
  text:
    `💡 Great, you are done with the ${ib('coin')}. Now, how about ${ib('creating your liquidity pool')}? Nothing ` +
    `complicated, to be honest! 😎\n\nYou may choose, what ${ib('liquidity provider')} you want to place your ` +
    `${ib('pool')} on. The ${b('RINsui_bot')} has 2 options: ${b('Turbos')} and ${b('Aftermath')}.\n\n` +
    `They differ by their provided liquidity types: ${b('Aftermath')} provides standard liquidity, while ` +
    `${b('Turbos')} provides concentrated one (there is no need to fully understand this; however, if you ` +
    `wish, you can just Google).\n\nAlso, ${b('Aftermath')} will index your ${ib('pool')} with at least ` +
    `${c('1000')} ${b('SUI')} deposited into it. Indexing in this case means, that you (and other users) ` +
    `won't be able to trade through this ${ib('pool')}, while it hasn't at least ${c('1000')} ${b('SUI')}, ` +
    `deposited into it.\n${b('Turbos')} currently has no such restrictions. However, the choice is entirely ` +
    `yours.\n\nFurther we will discuss, how to ${ib('create the pool')} on any of these ${ib('providers')}.`,
  // Turbos Pool creation is commented out until it won't be merged to `develop` or `main`
  nextItemCallbackQueryData: OnboardingCallbackQueryData./* CreateTurbosPoolPart1 */ CreateAftermathPoolPart1,
};
