import { BotContext } from '../../../../types';
import { articleCallbackQueryDataToArticlePageMenuMap } from '../structure';
import { OnboardingArticle, OnboardingArticleShowPageMethod } from '../types';

/**
 * Creates and returns method for showing given article page.
 */
export function onboardingPageFactory({
  callbackQueryData,
  text,
  videoUrl,
}: OnboardingArticle): OnboardingArticleShowPageMethod {
  return async function (ctx: BotContext) {
    const articlePageMenu = articleCallbackQueryDataToArticlePageMenuMap.get(callbackQueryData);

    if (articlePageMenu === undefined) {
      console.warn(
        `[onboardingPageFactory] articlePageMenu for "${callbackQueryData}" callback query data is not found.`,
      );
    }

    if (videoUrl !== undefined) {
      try {
        // Try to reply with video
        await ctx.replyWithVideo(videoUrl, {
          caption: text,
          reply_markup: articlePageMenu,
          parse_mode: `HTML`,
        });
      } catch (error) {
        // If cannot reply with video, show the page without one
        console.error(
          `[OnboardingArticleShowPageMethod] Cannot reply with video for "${callbackQueryData}" callback query data`,
        );

        await ctx.reply(text, {
          reply_markup: articlePageMenu,
          parse_mode: `HTML`,
          link_preview_options: { is_disabled: true },
        });
      }
    } else {
      await ctx.reply(text, {
        reply_markup: articlePageMenu,
        parse_mode: `HTML`,
        link_preview_options: { is_disabled: true },
      });
    }
  };
}
