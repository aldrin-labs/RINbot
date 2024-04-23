import { OnboardingArticleGroup, OnboardingNodeType } from '../../types';
import { activitiesWithDepositedFundsArticle } from './activities-with-deposited-funds';
import { buyArticle } from './buy';
import { createCoinArticle } from './create-coin';
import { createPoolArticleGroup } from './create-pool';
import { depositArticle } from './deposit';
import { exportPrivateKeyArticle } from './export-private-key';
import { sellAndManageArticleGroup } from './sell-and-manage';
import { botFeaturesStartArticle } from './start';
import { withdrawArticle } from './withdraw';

export const featuresArticleGroup: OnboardingArticleGroup = {
  type: OnboardingNodeType.ArticleGroup,
  name: 'Features',
  articles: [
    botFeaturesStartArticle,
    depositArticle,
    activitiesWithDepositedFundsArticle,
    buyArticle,
    sellAndManageArticleGroup,
    createCoinArticle,
    createPoolArticleGroup,
    withdrawArticle,
    exportPrivateKeyArticle,
  ],
};
