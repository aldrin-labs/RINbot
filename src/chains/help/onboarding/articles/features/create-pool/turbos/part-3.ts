import { b, c, ib } from '../../../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../../../types';

export const createTurbosPoolPart3Article: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Part 3',
  callbackQueryData: OnboardingCallbackQueryData.CreateTurbosPoolPart3,
  text:
    `✏ Once there is no pool with the parameters you specified, you'll be able to proceed and enter the amounts of ` +
    `the coins you want to ${ib('deposit into your pool')} (hence you need to have these ${ib('coins')} in your ` +
    `wallet).\n\nAfter the amounts are entered you will be able to choose a ${ib('price slippage')} for your pool. ` +
    `This parameter is optional and will be set to ${c('5%')} by default.\n\nIn simple words, ` +
    `${ib('price slippage')} means, how different can be the ${ib('expected swap price')} and the ` +
    `${ib('actual swap price')} (e.g. it can be changed due to market volatility).\nThere is no ${b('Turbos')} ` +
    `documentation about why you need to specify your ${ib('pool price slippage')}, so we just recommend setting ` +
    `this value to less than or equal to ${c('5%')}.\n\nThen you can just have a look at the parameters you entered ` +
    `for your pool and either confirm the ${ib('liquidity pool creation')} or cancel it for any reason (let's ` +
    `imagine you've confirmed 😇)\n\nPa-baam, you have created your pool, our congratulations! 🎉\n\nNow at any ` +
    `moment you can visit an ${ib('Owned Turbos Pools')} page (${ib('Launchpad')} —> ${ib('Pools')} —> ` +
    `${ib('Owned Turbos Pools')}) and explore your pool statistics, nice!`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.CreateAftermathPoolPart1,
};
