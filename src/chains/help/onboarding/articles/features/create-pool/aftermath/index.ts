import { OnboardingArticleGroup, OnboardingNodeType } from '../../../../types';
import { createAftermathPoolPart1Article } from './part-1';
import { createAftermathPoolPart2Article } from './part-2';

export const createAftermathPoolArticleGroup: OnboardingArticleGroup = {
  type: OnboardingNodeType.ArticleGroup,
  name: 'Create Aftermath Pool',
  articles: [createAftermathPoolPart1Article, createAftermathPoolPart2Article],
};
