import { b, c, ib } from '../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../types';

export const createCoinArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Create Coin',
  callbackQueryData: OnboardingCallbackQueryData.CreateCoin,
  text:
    `✅ Ok, you've found out, how to ${ib('trade')} your favorite ${ib('coins')} and manage your ${ib('positions')} ` +
    `– that's nice!\n\nHow about something advanced… Like ${ib('your coin creation')}? 😏\n\nThe minimum balance ` +
    `you must have for ${ib('coin creation')} is ${c('1')} ${b('SUI')} (no fees, only gas costs). Most likely it ` +
    `will take less.\n\nTo ${ib('create the new coin')}, just choose ${ib('Launchpad')} —> ${ib('Create Coin')}. ` +
    `You'll have to enter the following information about your ${ib('coin')}:\n\n1. ${ib('Coin name')} ` +
    `(e.g. ${c('My Awesome Coin')})\n2. ${ib('Coin symbol')} (e.g. ${c('AWESOME')})\n3. ${ib('Coin description')} ` +
    `(optional, e.g. ${c('Some description about my awesome coin')})\n4. ${ib('Coin image')} (optional)\n` +
    `5. ${ib('Coin decimals')} (e.g. ${c('9')})\n6. ${ib('Coin total supply')} meaning, how many ${ib('coins')} ` +
    `will be created (e.g. ${c('1000000')})\n7. Whether ${ib('supply')} will be fixed or not.\nIf yes, the entire ` +
    `supply will be sent to the burn address.\nIf not, the entire supply will be sent to you.\n\nAfter all these ` +
    `enterings, you will be able to enjoy your newly ${ib('created coin')} 😉`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.CreatePoolStart,
};
