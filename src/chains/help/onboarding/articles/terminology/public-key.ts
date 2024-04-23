import { b, ib, u } from '../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../types';

export const publicKeyArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Public Key',
  text:
    `📗 Let's start with a short and useful terminology!\n\nThe ${b('RINsui_bot')} have created a wallet ` +
    `for you. This wallet has a ${ib('public key')} and a ${ib('private key')}, ` +
    `like in any other blockchain.\n\nSo, what is the ${ib('public key')}?\n\n— ${ib('Public key')} ` +
    `for your wallet ` +
    `is like an address for your home. If someone wants to send you some post, he/she needs your address. ` +
    `The same goes for funds transferring in crypto — if someone wants to send you some funds, ` +
    `he/she needs your ${ib('public key')}.\n\nSharing the ${ib('public key')} is ${u('safe')} — users who know your ` +
    `${ib('public key')} still have no access to your wallet, they just know your address.`,
  callbackQueryData: OnboardingCallbackQueryData.PublicKey,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.PrivateKey,
};
