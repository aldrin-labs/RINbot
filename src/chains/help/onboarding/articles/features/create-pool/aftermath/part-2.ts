import { b, c, ib } from '../../../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../../../types';

export const createAftermathPoolPart2Article: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Part 2',
  callbackQueryData: OnboardingCallbackQueryData.CreateAftermathPoolPart2,
  text:
    `✏ Then enter the ${ib('pool name')}. Usually, it consists ` +
    `of the ${ib('coin symbols')} you've chosen for your pool. For example, you want to create the pool with ` +
    `${b('RINCEL')} and ${b('SUI')} ${ib('coins')}. Then the canonical ${ib('pool name')} would be ` +
    `${b('RINCEL/SUI')}.\n\nAfter that, you can specify the ${ib('pool fee rate')} right in percentages ` +
    `(e.g. ${c('0.25')} or ${c('1')}) and pa-baam! 🎉\n\nThe ${ib('LP coin')} is created, the ${ib('pool')} is ` +
    `created, and you can have a look at it either at the ${b('Aftermath')} website (link will be shared) or at our ` +
    `${ib('Owned Aftermath Pools')} page (${ib('Launchpad')} —> ${ib('Pools')} —> ` +
    `${ib('Owned Aftermath Pools')}).\n\nThat's it, you already are the advanced ${b('RINsui_bot')} user! 😊`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.Withdraw,
};
