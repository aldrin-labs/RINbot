import { OnboardingArticleGroup, OnboardingNodeType } from '../../../types';
import { coinDecimalsArticle } from './coin-decimals';
import { coinPropsArticle } from './coin-props';
import { coinSymbolArticle } from './coin-symbol';
import { stablecoinArticle } from './stablecoin';
import { coinStartArticle } from './start';
import { volatileCoinArticle } from './volatile-coin';

export const coinArticleGroup: OnboardingArticleGroup = {
  type: OnboardingNodeType.ArticleGroup,
  name: 'Coin',
  articles: [
    coinStartArticle,
    stablecoinArticle,
    volatileCoinArticle,
    coinPropsArticle,
    coinSymbolArticle,
    coinDecimalsArticle,
  ],
};
