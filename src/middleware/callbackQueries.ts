import { Bot } from 'grammy';
import { ConversationId } from '../chains/conversations.config';
import { SurfdogConversationId } from '../chains/launchpad/surfdog/conversations/conversations.config';
import { showSurfdogPage } from '../chains/launchpad/surfdog/show-pages/showSurfdogPage';
import { showUserTickets } from '../chains/launchpad/surfdog/show-pages/showUserTickets';
import { showRefundsPage } from '../chains/refunds/showRefundsPage';
import { slippagePercentages } from '../chains/slippage/percentages';
import { showSlippageConfiguration } from '../chains/slippage/showSlippageConfiguration';
import { assets, home } from '../chains/sui.functions';
import { retryAndGoHomeButtonsData } from '../inline-keyboards/retryConversationButtonsFactory';
import { BotContext } from '../types';
import { CallbackQueryData } from '../types/callback-queries-data';

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

  bot.callbackQuery(CallbackQueryData.Assets, async (ctx) => {
    await assets(ctx);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(CallbackQueryData.ExportPrivateKey, async (ctx) => {
    await ctx.conversation.exit();
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter(ConversationId.ExportPrivateKey);
  });

  useSurfdogCallbackQueries(bot);
  useSlippageCallbackQueries(bot);
  useRefundsCallbackQueries(bot);

  Object.keys(retryAndGoHomeButtonsData).forEach((conversationId) => {
    bot.callbackQuery(`retry-${conversationId}`, async (ctx) => {
      await ctx.conversation.exit();
      await ctx.conversation.enter(conversationId);
      await ctx.answerCallbackQuery();
    });
  });

  // We need this to handle button clicks which are not handled wherever (e.g. in conversations)
  bot.on('callback_query:data', async (ctx) => {
    console.log('Unknown button event with payload', ctx.callbackQuery.data);
    await ctx.answerCallbackQuery();
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

function useSlippageCallbackQueries(bot: Bot<BotContext>) {
  slippagePercentages.forEach((percentage) => {
    bot.callbackQuery(`slippage-${percentage}`, async (ctx) => {
      ctx.session.settings.slippagePercentage = percentage;

      await showSlippageConfiguration(ctx);
      await ctx.answerCallbackQuery();
    });
  });
}

function useRefundsCallbackQueries(bot: Bot<BotContext>) {
  bot.callbackQuery(CallbackQueryData.Refunds, async (ctx) => {
    await ctx.answerCallbackQuery();
    await showRefundsPage(ctx);
  });

  bot.callbackQuery(CallbackQueryData.ContinueWithRefund, async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter(ConversationId.CheckCurrentWalletForRefund);
  });
}
