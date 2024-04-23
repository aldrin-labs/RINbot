import { b, ib } from '../../../../../../text-formatting/formats';
import { OnboardingCallbackQueryData } from '../../../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../../../types';

export const viewPositionsArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'View Positions',
  callbackQueryData: OnboardingCallbackQueryData.ViewPositions,
  text:
    `📊 Amazing, now you have your first ${ib('position')}! Do you wanna have a look at more information about it? ` +
    `Easily!\n\nBy the way, your first ${ib('5 positions')} are shown right on the ` +
    `main page. The ${ib('position')} information includes the current ${ib('coin price')}, your ` +
    `${ib('coin balance')} (and its equivalent in ${b('$')}), a 1-hour ${ib('coin price')} change, and a 24-hour ` +
    `${ib('coin price')} change.\n\nAdditionally, you can click on the ${ib('Sell & Manage')} button. There ` +
    `you can see each ${ib('position')} information (if you have more than one, switch between them with the ` +
    `help of arrows in the menu).`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.Sell,
};
