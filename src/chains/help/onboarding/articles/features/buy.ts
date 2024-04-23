import { a, b, ib } from '../../../../../text-formatting/formats';
import { RINCEL_COIN_TYPE } from '../../../../sui.config';
import { getSuiScanCoinLink } from '../../../../utils';
import { OnboardingCallbackQueryData } from '../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../types';

const suiScanLink = 'https://suiscan.xyz/mainnet/coins';

export const buyArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Buy',
  callbackQueryData: OnboardingCallbackQueryData.Buy,
  text:
    `📈 First, how to ${ib('buy')} your desired ${ib('coin')}?\n\nAt the main menu, you can see a ${ib('Buy')} ` +
    `button. After clicking you'll have to enter the desired ${ib('coin type')}.\n\n«But where can I find the ` +
    `${ib('type')} of ${ib('coin')} I want to buy?» — will ask you.\n«At any explorer 😉» — ` +
    `will answer we.\n\nFrom our experience, the most friendly place for finding the ${ib('coin')} information is ` +
    `${a('Suiscan', suiScanLink)}.\nSo there you can just enter the ${ib('coin symbol')} in a search field, ` +
    `choose the most popular ${ib('coin')} (e.g. which has the most holders), and copy the ${ib('type')} on its ` +
    `page.\nOr you can just copy a link to the Suiscan ${ib('coin')} page.\n\nExample of the link to the ` +
    `Suiscan ${b('RINCEL')} page:\n${getSuiScanCoinLink(RINCEL_COIN_TYPE)}\n\nSo, you've entered the ` +
    `${ib('coin type')} or Suiscan link. Now just enter the amount of ${b('SUI')} you want to spend on this ` +
    `${ib('buy')}. After that, you will be notified, how much the desired ${ib('coin')} you are going to ` +
    `${ib('buy')}, and you can either confirm or cancel the ${ib('swap')}.\n\nCongrats, you have succeeded! 😎`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.ViewPositions,
  videoUrl: 'https://fastupload.io/rWsS84bB8Fx3/IT1L3xaadxvckHo/2bJG85QlrmOBE/buy.mp4',
};
