import { b, c, ib, s } from '../../../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../../../types';

export const createAftermathPoolPart1Article: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Part 1',
  callbackQueryData: OnboardingCallbackQueryData.CreateAftermathPoolPart1,
  text:
    `✏ Now we are going to find out, how to ${ib('create the Aftermath liquidity pool')} by the ${b('RINsui_bot')} ` +
    `😎\n\nNothing special, you also have to specify ${ib('2 coins')} you want to be in your pool, and then you ` +
    `will start to create an ${ib('LP coin')}.\n\nThe ${ib('LP coin')} is the ${ib('coin')} that the user deposited ` +
    `to your pool will receive as a confirmation of his deposit. The more the user deposits into the pool, the more ` +
    `${ib('LP coins')} he receives.\n\n${s(
      `Note that you won't own the ${ib('LP coin')} supplies, unlike the ` +
        `${ib('coin')} you created with the ${b('RINsui_bot')} coin creation tool.`,
    )}\n\nSo, you have to specify the ${ib('LP coin name')} (e.g. ${c('My new coin')}) and the ` +
    `${ib('LP coin symbol')} (e.g. ${c('MY_NEW_COIN')}).`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.CreateAftermathPoolPart2,
};
