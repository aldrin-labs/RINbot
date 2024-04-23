import { Menu } from '@grammyjs/menu';
import { v4 as uuidv4 } from 'uuid';
import { shouldBeRowAfterButton } from '../../../inline-keyboards/utils';
import { BotContext } from '../../../types';
import { articleCallbackQueryDataToShowPageMethodMap } from './structure';
import { OnboardingArticle, OnboardingNodeType, OnboardingTreeNode } from './types';

/**
 * Recursively collects and returns all the articles from given `nodes`.
 */
export function getAllArticlesFromTree(nodes: OnboardingTreeNode[]): OnboardingArticle[] {
  const allArticles: OnboardingArticle[] = [];

  for (const node of nodes) {
    if (node.type === OnboardingNodeType.Article) {
      allArticles.push(node);
    } else if (node.type === OnboardingNodeType.ArticleGroup) {
      const articlesFromGroup = getAllArticlesFromTree(node.articles);
      allArticles.push(...articlesFromGroup);
    }
  }

  return allArticles;
}

/**
 * Constructs a tree menu:
 * 1. Article node corresponds to the button leading to the article page.
 * 2. Article group node corresponds to the button, that is submenu containing all the nested nodes.
 */
export function getOnboardingMenuByNodes({ nodes, menuId }: { nodes: OnboardingTreeNode[]; menuId: string }) {
  const menu = new Menu<BotContext>(menuId);
  const subMenus: Menu<BotContext>[] = [];

  nodes.forEach((node, currentNodeIndex) => {
    if (node.type === OnboardingNodeType.Article) {
      const showPage = articleCallbackQueryDataToShowPageMethodMap.get(node.callbackQueryData);

      if (showPage === undefined) {
        console.warn(
          `[getOnboardingMenuByNodes] showPage method for "${node.callbackQueryData}" callback query data ` +
            `is not found.`,
        );
        return;
      }

      menu.text(node.name, async (ctx) => {
        await showPage(ctx);
      });

      if (shouldBeRowAfterButton(currentNodeIndex, 2)) {
        menu.row();
      }
    } else if (node.type === OnboardingNodeType.ArticleGroup) {
      const subMenuId = uuidv4();

      const subMenu = getOnboardingMenuByNodes({
        menuId: subMenuId,
        nodes: node.articles,
      });

      menu.submenu(node.name, subMenuId);

      if (shouldBeRowAfterButton(currentNodeIndex, 2)) {
        menu.row();
      }

      subMenus.push(subMenu);
    }
  });

  menu.back('Back');

  // Sub-menus must be registered after their changes. Otherwise grammY will throw an error.
  subMenus.forEach((subMenu) => menu.register(subMenu));

  return menu;
}
