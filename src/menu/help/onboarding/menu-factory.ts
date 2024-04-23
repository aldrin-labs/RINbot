import { Menu } from '@grammyjs/menu';
import { v4 as uuidv4 } from 'uuid';
import { onboardingSectionsMenuId } from '../../../chains/help/onboarding/config';
import { articleCallbackQueryDataToShowPageMethodMap } from '../../../chains/help/onboarding/structure';
import { OnboardingArticle } from '../../../chains/help/onboarding/types';
import { home } from '../../../chains/sui.functions';
import { BotContext } from '../../../types';

/**
 * Creates and returns a menu for an onboarding article page.
 * @param article - Article for which page will be created the menu.
 */
export function onboardingArticlePageMenuFactory(article: OnboardingArticle): Menu<BotContext> {
  const menuId = uuidv4();
  const menu = new Menu<BotContext>(menuId);

  menu
    .dynamic((ctx, range) => {
      const showNextPage = articleCallbackQueryDataToShowPageMethodMap.get(article.nextItemCallbackQueryData);

      if (showNextPage === undefined) {
        console.warn(
          `[onboardingArticlePageMenuFactory] showNextPage for "${article.nextItemCallbackQueryData}" next item ` +
            `callback query data is not found.`,
        );
      } else {
        range.text('Next', async (ctx) => {
          await showNextPage(ctx);
        });
      }
    })
    .text('Finish', async (ctx) => {
      await home(ctx);
    })
    .row()
    .submenu('Sections', onboardingSectionsMenuId);

  return menu;
}
