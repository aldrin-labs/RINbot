import { OnboardingArticleGroup, OnboardingNodeType } from '../../types';
import { availableSuiBalanceArticle } from './available-sui-balance';
import { coinArticleGroup } from './coin';
import { liquidityPoolsArticle } from './liquidity-pools';
import { liquidityProvidersArticle } from './liquidity-providers';
import { positionArticle } from './position';
import { privateKeyArticle } from './private-key';
import { publicKeyArticle } from './public-key';

export const terminologyArticleGroup: OnboardingArticleGroup = {
  type: OnboardingNodeType.ArticleGroup,
  name: 'Terminology',
  articles: [
    publicKeyArticle,
    privateKeyArticle,
    coinArticleGroup,
    positionArticle,
    availableSuiBalanceArticle,
    liquidityProvidersArticle,
    liquidityPoolsArticle,
  ],
};
