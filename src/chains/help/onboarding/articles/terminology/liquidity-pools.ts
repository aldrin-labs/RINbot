import { b, c, ib } from '../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../types';

export const liquidityPoolsArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Liquidity Pools',
  callbackQueryData: OnboardingCallbackQueryData.LiquidityPools,
  text:
    `💱 And what are the ${ib('liquidity pools')}?\n\n— You can think of the ${ib('liquidity pools')} as little ` +
    `currency exchanges. A customer (${ib('user')}) goes to the currency exchange (${ib('pool')}) to swap one ` +
    `currency for another currency (one ${ib('coin')} for another ${ib('coin')}).\n\nUsually, the ${ib('pool')} ` +
    `just contains ${ib('2 coins')}, and the user can come and say: “Hey, I want to give you ` +
    `${c('N')} ${b('COIN1')} and receive ${c('N')} ${b('COIN2')}!”, or “Hey, I give you ${c('N')} ${b('COIN2')}, ` +
    `give me ${c('N')} ${b('COIN1')}” – and it will be done.\n\nCertainly, that's just an abstraction, under ` +
    `the hood the ${ib('liquidity pool')} is a bit more complicated. So, if you want to dive deeper, you can ` +
    `just Google, what is the ${ib('liquidity pool')}.\n\nBut now we will go further 😎`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.BotFeaturesStart,
};
