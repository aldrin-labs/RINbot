import { OnboardingArticleGroup, OnboardingNodeType } from '../../../types';
import { buyAtSellAndManageArticle } from './increase-position';
import { sellArticle } from './sell';
import { viewPositionsArticle } from './view-positions';

export const sellAndManageArticleGroup: OnboardingArticleGroup = {
  type: OnboardingNodeType.ArticleGroup,
  name: 'Sell & Manage',
  articles: [viewPositionsArticle, sellArticle, buyAtSellAndManageArticle],
};
