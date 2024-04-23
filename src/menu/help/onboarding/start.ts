import { Menu } from '@grammyjs/menu';
import { firstArticleCallbackQueryData, onboardingSectionsMenuId } from '../../../chains/help/onboarding/config';
import {
  articleCallbackQueryDataToArticlePageMenuMap,
  articleCallbackQueryDataToShowPageMethodMap,
} from '../../../chains/help/onboarding/structure';
import { home } from '../../../chains/sui.functions';
import { BotContext } from '../../../types';
import onboardingSectionsMenu from './sections';

const onboardingStartMenu = new Menu<BotContext>('onb-start')
  .dynamic((ctx, range) => {
    const showPage = articleCallbackQueryDataToShowPageMethodMap.get(firstArticleCallbackQueryData);

    if (showPage === undefined) {
      console.warn(
        `[onboardingStartMenu] showPage for "${firstArticleCallbackQueryData}" callback query data is not found.`,
      );
    } else {
      range.text("Let's go!", async (ctx) => {
        await showPage(ctx);
      });
    }
  })
  .row()
  .submenu('Sections', onboardingSectionsMenuId)
  .text('Finish', async (ctx) => {
    await home(ctx);
  });

// Register sections menu
onboardingStartMenu.register(onboardingSectionsMenu);

// Register all articles menus
const articleMenus = Array.from(articleCallbackQueryDataToArticlePageMenuMap.values());
onboardingStartMenu.register(articleMenus);

export default onboardingStartMenu;
