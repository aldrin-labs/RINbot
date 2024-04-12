import { Bot } from 'grammy';
import { ConversationId } from '../chains/conversations.config';
import { SurfdogConversationId } from '../chains/launchpad/surfdog/conversations/conversations.config';
import { showSurfdogPage } from '../chains/launchpad/surfdog/show-pages/showSurfdogPage';
import { showUserTickets } from '../chains/launchpad/surfdog/show-pages/showUserTickets';
import { showDetailedPoolsInfo } from '../chains/pools/turbos/show-detailed-pools-info';
import { showOwnedTurbosPools } from '../chains/pools/turbos/show-owned-pools';
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
    await ctx.deleteMessage();
    await home(ctx);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('go-home', async (ctx) => {
    await home(ctx);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(CallbackQueryData.Assets, async (ctx) => {
    await assets(ctx);
    await ctx.answerCallbackQuery();
  });

  useSurfdogCallbackQueries(bot);
  useSlippageCallbackQueries(bot);
  useRefundsCallbackQueries(bot);
  useWalletCallbackQueries(bot);
  usePoolsCallbackQueries(bot);

  Object.keys(retryAndGoHomeButtonsData).forEach((conversationId) => {
    bot.callbackQuery(`retry-${conversationId}`, async (ctx) => {
      await ctx.answerCallbackQuery();
      await ctx.conversation.exit();
      await ctx.conversation.enter(conversationId);
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
}

function useWalletCallbackQueries(bot: Bot<BotContext>) {
  bot.callbackQuery(CallbackQueryData.ExportPrivateKey, async (ctx) => {
    await ctx.conversation.exit();
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter(ConversationId.ExportPrivateKey);
  });

  bot.callbackQuery(CallbackQueryData.ImportWallet, async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter(ConversationId.ImportNewWallet);
  });
}

function usePoolsCallbackQueries(bot: Bot<BotContext>) {
  bot.callbackQuery(CallbackQueryData.ShowOwnedTurbosPools, async (ctx) => {
    await ctx.answerCallbackQuery();
    await showOwnedTurbosPools(ctx);
  });

  bot.callbackQuery(CallbackQueryData.CreateTurbosPool, async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter(ConversationId.CreateTurbosPool);
  });

  bot.callbackQuery(CallbackQueryData.LoadDetailedPoolsInfo, async (ctx) => {
    await ctx.answerCallbackQuery();
    await showDetailedPoolsInfo(ctx);
  });
}
