import { Bot } from 'grammy';
import { SurfdogConversationId } from '../chains/launchpad/surfdog/conversations/conversations.config';
import { showSurfdogPage } from '../chains/launchpad/surfdog/show-pages/showSurfdogPage';
import { showUserTickets } from '../chains/launchpad/surfdog/show-pages/showUserTickets';
import { home } from '../chains/sui.functions';
import { retryAndGoHomeButtonsData } from '../inline-keyboards/retryConversationButtonsFactory';
import { BotContext } from '../types';

export function useCallbackQueries(bot: Bot<BotContext>) {
  bot.callbackQuery('close-conversation', async (ctx) => {
    await ctx.conversation.exit();
    ctx.session.step = 'main';
    await ctx.deleteMessage();
    await home(ctx);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('go-home', async (ctx) => {
    ctx.session.step = 'main';
    await home(ctx);
    await ctx.answerCallbackQuery();
  });

  useSurfdogCallbackQueries(bot);

  Object.keys(retryAndGoHomeButtonsData).forEach((conversationId) => {
    bot.callbackQuery(`retry-${conversationId}`, async (ctx) => {
      await ctx.conversation.exit();
      await ctx.conversation.enter(conversationId);
      await ctx.answerCallbackQuery();
    });
  });
}

function useSurfdogCallbackQueries(bot: Bot<BotContext>) {
  bot.callbackQuery('buy-more-surfdog-tickets', async (ctx) => {
    await ctx.conversation.enter(SurfdogConversationId.BuySurfdogTickets);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('user-surfdog-tickets', async (ctx) => {
    await showUserTickets(ctx);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('surfdog-home', async (ctx) => {
    await showSurfdogPage(ctx);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('close-surfdog-conversation', async (ctx) => {
    await ctx.conversation.exit();
    await ctx.deleteMessage();
    await showSurfdogPage(ctx);
    await ctx.answerCallbackQuery();
  });
}
