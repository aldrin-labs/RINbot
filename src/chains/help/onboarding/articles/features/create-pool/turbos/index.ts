import { OnboardingArticleGroup, OnboardingNodeType } from '../../../../types';
import { createTurbosPoolPart1Article } from './part-1';
import { createTurbosPoolPart2Article } from './part-2';
import { createTurbosPoolPart3Article } from './part-3';

export const createTurbosPoolArticleGroup: OnboardingArticleGroup = {
  type: OnboardingNodeType.ArticleGroup,
  name: 'Create Turbos Pool',
  articles: [createTurbosPoolPart1Article, createTurbosPoolPart2Article, createTurbosPoolPart3Article],
};
