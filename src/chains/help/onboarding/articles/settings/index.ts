import { OnboardingArticleGroup, OnboardingNodeType } from '../../types';
import { coinWhitelistArticle } from './coin-whitelist';
import { feeSystemArticle } from './fee-system';
import { priceDifferenceThresholdArticle } from './price-difference-threshold';
import { slippageArticleGroup } from './slippage';
import { settingsStartArticle } from './start';
import { swapConfirmationArticle } from './swap-confirmation';

export const settingsArticleGroup: OnboardingArticleGroup = {
  type: OnboardingNodeType.ArticleGroup,
  name: 'Settings',
  articles: [
    settingsStartArticle,
    slippageArticleGroup,
    feeSystemArticle,
    swapConfirmationArticle,
    priceDifferenceThresholdArticle,
    coinWhitelistArticle,
  ],
};
