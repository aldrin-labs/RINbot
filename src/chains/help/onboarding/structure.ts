import { Menu } from '@grammyjs/menu';
import { onboardingArticlePageMenuFactory } from '../../../menu/help/onboarding/menu-factory';
import { BotContext } from '../../../types';
import { conclusionArticle } from './articles/conclusion';
import { featuresArticleGroup } from './articles/features';
import { settingsArticleGroup } from './articles/settings';
import { terminologyArticleGroup } from './articles/terminology';
import { OnboardingCallbackQueryData } from './callback-query-data';
import { onboardingPageFactory } from './pages/page-factory';
import { OnboardingArticle, OnboardingArticleShowPageMethod, OnboardingTreeNode } from './types';
import { getAllArticlesFromTree } from './utils';

/**
 * This is a root node of an onboarding articles tree.
 */
export const onboardingRootNode: OnboardingTreeNode[] = [
  terminologyArticleGroup,
  featuresArticleGroup,
  settingsArticleGroup,
  conclusionArticle,
];

/**
 * Contains all the articles of the onboarding articles tree.
 */
export const onboardingArticles: OnboardingArticle[] = getAllArticlesFromTree(onboardingRootNode);

/**
 * Map contains `showPage` methods, associated with an article callback query data.
 */
export const articleCallbackQueryDataToShowPageMethodMap: Map<
  OnboardingCallbackQueryData,
  OnboardingArticleShowPageMethod
> = onboardingArticles.reduce((map, article) => {
  const showPage = onboardingPageFactory(article);

  map.set(article.callbackQueryData, showPage);

  return map;
}, new Map());

/**
 * Map contains article page menus, associated with an article callback query data.
 */
export const articleCallbackQueryDataToArticlePageMenuMap: Map<
  OnboardingCallbackQueryData,
  Menu<BotContext>
> = onboardingArticles.reduce((map, article) => {
  const articlePageMenu = onboardingArticlePageMenuFactory(article);

  map.set(article.callbackQueryData, articlePageMenu);

  return map;
}, new Map());
