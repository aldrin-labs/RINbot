import { BotContext } from '../../../types';
import { OnboardingCallbackQueryData } from './callback-query-data';

export enum OnboardingNodeType {
  ArticleGroup,
  Article,
}

/**
 * Article is a tree node, that doesn't have child nodes.
 */
export type OnboardingArticle = {
  type: OnboardingNodeType.Article;
  text: string;
  name: string;
  callbackQueryData: OnboardingCallbackQueryData;
  nextItemCallbackQueryData: OnboardingCallbackQueryData;
};

/**
 * Article group is a tree node, that has child nodes — articles.
 */
export type OnboardingArticleGroup = {
  type: OnboardingNodeType.ArticleGroup;
  name: string;
  articles: OnboardingTreeNode[];
};

export type OnboardingTreeNode = OnboardingArticle | OnboardingArticleGroup;

/**
 * Method that shows onboarding article page.
 */
export type OnboardingArticleShowPageMethod = (ctx: BotContext) => Promise<void>;
