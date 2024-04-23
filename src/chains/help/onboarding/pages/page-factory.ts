import { BotContext } from '../../../../types';
import { articleCallbackQueryDataToArticlePageMenuMap } from '../structure';
import { OnboardingArticleShowPageMethod, OnboardingArticle } from '../types';

/**
 * Creates and returns method for showing given article page.
 */
export function onboardingPageFactory({ callbackQueryData, text }: OnboardingArticle): OnboardingArticleShowPageMethod {
  return async function (ctx: BotContext) {
    const articlePageMenu = articleCallbackQueryDataToArticlePageMenuMap.get(callbackQueryData);

    if (articlePageMenu === undefined) {
      console.warn(
        `[onboardingPageFactory] articlePageMenu for "${callbackQueryData}" callback query data is not found.`,
      );
    }

    await ctx.reply(text, {
      reply_markup: articlePageMenu,
      parse_mode: `HTML`,
      link_preview_options: { is_disabled: true },
    });
  };
}
