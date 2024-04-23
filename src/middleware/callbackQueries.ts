import { Bot } from 'grammy';
import { showCoinWhitelist } from '../chains/coin-whitelist/showCoinWhitelist';
import { ConversationId } from '../chains/conversations.config';
import { SurfdogConversationId } from '../chains/launchpad/surfdog/conversations/conversations.config';
import { showSurfdogPage } from '../chains/launchpad/surfdog/show-pages/showSurfdogPage';
import { showUserTickets } from '../chains/launchpad/surfdog/show-pages/showUserTickets';
import { showRefundsPage } from '../chains/refunds/showRefundsPage';
import { priceDifferenceThresholdPercentages } from '../chains/settings/price-difference-threshold/percentages';
import { OnboardingCallbackQueryData } from '../chains/help/onboarding/callback-query-data';
import { showStartOnboardingPage } from '../chains/help/onboarding/pages/start';
// eslint-disable-next-line max-len
import { showPriceDifferenceThresholdPage } from '../chains/settings/price-difference-threshold/show-price-difference-page';
import { slippagePercentages } from '../chains/settings/slippage/percentages';
import { showSlippageConfiguration } from '../chains/settings/slippage/showSlippageConfiguration';
import { showSwapConfirmationPage } from '../chains/settings/swap-confirmation/show-swap-confirmation-page';
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

  bot.callbackQuery(CallbackQueryData.Home, async (ctx) => {
    await ctx.conversation.exit();
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
  useCoinWhitelistCallbackQueries(bot);
  useSwapConfirmationCallbackQueries(bot);
  usePriceDifferenceThresholdCallbackQueries(bot);
  useOnboardingCallbackQueries(bot);

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

function usePriceDifferenceThresholdCallbackQueries(bot: Bot<BotContext>) {
  priceDifferenceThresholdPercentages.forEach((percentage) => {
    bot.callbackQuery(`price-difference-threshold-${percentage}`, async (ctx) => {
      ctx.session.settings.priceDifferenceThreshold = percentage;

      await ctx.answerCallbackQuery();
      await showPriceDifferenceThresholdPage(ctx);
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

function useCoinWhitelistCallbackQueries(bot: Bot<BotContext>) {
  bot.callbackQuery(CallbackQueryData.CoinWhitelist, async (ctx) => {
    await ctx.answerCallbackQuery();
    await showCoinWhitelist(ctx);
  });
}

function useSwapConfirmationCallbackQueries(bot: Bot<BotContext>) {
  bot.callbackQuery(CallbackQueryData.EnableSwapConfirmation, async (ctx) => {
    ctx.session.settings.swapWithConfirmation = true;
    await ctx.answerCallbackQuery();
    await showSwapConfirmationPage(ctx);
  });

  bot.callbackQuery(CallbackQueryData.DisableSwapConfirmation, async (ctx) => {
    ctx.session.settings.swapWithConfirmation = false;
    await ctx.answerCallbackQuery();
    await showSwapConfirmationPage(ctx);
  });
}

function useOnboardingCallbackQueries(bot: Bot<BotContext>) {
  bot.callbackQuery(OnboardingCallbackQueryData.Start, async (ctx) => {
    await showStartOnboardingPage(ctx);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(OnboardingCallbackQueryData.Finish, async (ctx) => {
    await home(ctx);
    await ctx.answerCallbackQuery();
  });
}
