import { ib } from '../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../types';

export const liquidityProvidersArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Liquidity Providers',
  callbackQueryData: OnboardingCallbackQueryData.LiquidityProviders,
  text:
    `🏦 Ok, and who are the guys who are called ${ib('liquidity providers')}?\n\n— ${ib('Liquidity providers')} ` +
    `are usually companies through which you can trade ${ib('coins')}. They have so-called ` +
    `${ib('liquidity pools')}, thanks to which trading is possible.`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.LiquidityPools,
};
