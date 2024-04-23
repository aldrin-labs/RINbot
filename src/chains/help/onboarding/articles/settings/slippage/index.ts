import { OnboardingArticleGroup, OnboardingNodeType } from '../../../types';
import { slippagePart1Article } from './part-1';
import { slippagePart2Article } from './part-2';
import { slippagePart3Article } from './part-3';

export const slippageArticleGroup: OnboardingArticleGroup = {
  type: OnboardingNodeType.ArticleGroup,
  name: 'Slippage',
  articles: [slippagePart1Article, slippagePart2Article, slippagePart3Article],
};
