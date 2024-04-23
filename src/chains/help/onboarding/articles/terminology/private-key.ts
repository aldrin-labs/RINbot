import { ib } from '../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../types';

export const privateKeyArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Private Key',
  text:
    `🔐 Ooo-kay, and what is the ${ib('private key')}?\n\n— ${ib('Private key')} for your wallet ` +
    `is like a key for your home. If you want to have access to your home, you need the key. ` +
    `The same goes for the wallet — if you want to have access to your wallet, you need the ` +
    `${ib('private key')}.\n\n` +
    `⚠️ Sharing the ${ib('private key')} means sharing access to your wallet, so be careful with this.`,
  callbackQueryData: OnboardingCallbackQueryData.PrivateKey,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.CoinStart,
};
