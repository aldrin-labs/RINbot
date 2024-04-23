import { b, ib } from '../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../types';

export const exportPrivateKeyArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Export Private Key',
  callbackQueryData: OnboardingCallbackQueryData.ExportPrivateKey,
  text:
    `✉ Ok, and how about your ${b('RINsui_bot')} wallet ${ib('private key exporting')}?\n\nThat's also pretty ` +
    `simple: just go to the ${ib('Wallet')} —> ${ib('Export Private Key')} and type a ${ib('CONFIRM')} word (one ` +
    `more step for your safety) – and you are done!`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.SettingsStart,
};
