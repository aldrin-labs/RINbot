import { b, c, ib, s } from '../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../types';

export const feeSystemArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Fee System',
  callbackQueryData: OnboardingCallbackQueryData.FeeSystem,
  text:
    `💳 The next thing you will pick up is the ${b('RINsui_bot')} ${ib('fee system')}.\n\nIt's pretty simple though: ` +
    `${ib('the more RINCEL you have, the lower the fees')}.\n\nCurrently, the following ${ib('fee levels')} exist:\n` +
    `1) If you have less than ${c('10,000')} ${b('RINCEL')} – the fee is ${c('1%')}\n` +
    `2) If you have ${c('10,000')} ${b('RINCEL')} or more, but less than ${c('1,000,000')} ${b('RINCEL')} – ` +
    `the fee is ${c('0.75%')}\n3) If you have ${c('1,000,000')} ${b('RINCEL')} or more – the fee is ${c('0.5%')}\n\n` +
    `You can always have a look at your ${ib('fee level')} on the fees page: ${ib('Settings')} —> ${ib('Fees')}.\n\n` +
    `${s(`P.S. The fees are charged only on a ${ib('coin buy')}. All the other features do not have any fees now.`)}`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.SwapConfirmation,
  videoUrl: 'https://fastupload.io/2QcKjIZU9CwA/0BkSKAHuJ9rgG15/gXeGOM5qX3Aa7/fees.mp4',
};
