import { OnboardingArticleGroup, OnboardingNodeType } from '../../../types';
import { createAftermathPoolArticleGroup } from './aftermath';
import { createPoolStartArticle } from './start';

export const createPoolArticleGroup: OnboardingArticleGroup = {
  type: OnboardingNodeType.ArticleGroup,
  name: 'Create Pool',
  // Turbos Pool creation is commented out until it won't be merged to `develop` or `main`
  articles: [createPoolStartArticle /* , createTurbosPoolArticleGroup */, createAftermathPoolArticleGroup],
};
