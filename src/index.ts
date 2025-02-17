import { LONG_SUI_COIN_TYPE } from '@avernikoz/rinbot-sui-sdk';
import { autoRetry } from '@grammyjs/auto-retry';
import { conversations } from '@grammyjs/conversations';
import { RedisAdapter } from '@grammyjs/storage-redis';
import { kv as instance } from '@vercel/kv';
import { Bot, Composer, Enhance, GrammyError, HttpError, enhanceStorage, session } from 'grammy';
import { CommonConversationId } from './chains/conversations.config';
import { DEFAULT_SLIPPAGE } from './chains/settings/slippage/percentages';
import { generateWallet, home } from './chains/sui.functions';
import { DEFAULT_PRICE_DIFFERENCE_THRESHOLD_PERCENTAGE } from './chains/trading/config';
import { balances } from './commands/balances';
import { BOT_TOKEN, ENVIRONMENT, HISTORY_TABLE, WELCOME_BONUS_AMOUNT } from './config/bot.config';
import { conversationErrorBoundaryHandler } from './error-boundaries/conversations-boundary';
import { generalErrorBoundaryHandler } from './error-boundaries/general-boundary';
import menu from './menu/main';
import { useCallbackQueries } from './middleware/callbackQueries';
import { checkActiveConversationVersion } from './middleware/conversation-version-check';
import { useConversations } from './middleware/conversations/use-conversations';
import { enterConversation } from './middleware/conversations/utils';
import { timeoutMiddleware } from './middleware/timeoutMiddleware';
import { addActiveConversation } from './migrations/addActiveConversation';
import { addBoostedRefund } from './migrations/addBoostedRefund';
import { addIndexToAssets } from './migrations/addIndexToAssets';
import { addPriceDifferenceThreshold } from './migrations/addPriceDifferenceThreshold';
import { addRefundFields } from './migrations/addRefundFields';
import { addSuiAssetField } from './migrations/addSuiAssetField';
import { addSwapConfirmationSetting } from './migrations/addSwapConfirmationSetting';
import { addTradeAmountPercentageField } from './migrations/addTradeAmountPercentage';
import { addTradeCoin } from './migrations/addTradeCoin';
import { addTradesField } from './migrations/addTradesField';
import { addWelcomeBonus } from './migrations/addWelcomeBonus';
import { createBoostedRefundAccount } from './migrations/createBoostedRefundAccount';
import { enlargeDefaultSlippage } from './migrations/enlargeDefaultSlippage';
import { removeStep } from './migrations/removeStep';
import { documentClient } from './services/aws';
import { BotContext, SessionData } from './types';

const APP_VERSION = '3.0.8';

if (instance && instance['opts']) {
  instance['opts'].automaticDeserialization = false;
}

const storage = new RedisAdapter<Enhance<SessionData>>({ instance });

const bot = new Bot<BotContext>(BOT_TOKEN);

async function startBot(): Promise<void> {
  console.debug('[startBot] triggered');
  const composer = new Composer<BotContext>();
  const conversationsComposer = new Composer<BotContext>();
  const protectedConversationsComposer = conversationsComposer.errorBoundary(conversationErrorBoundaryHandler);

  composer.use(timeoutMiddleware);

  bot.lazy((ctx) => {
    return session({
      initial: (): SessionData => {
        const { privateKey, publicKey } = generateWallet();
        const boostedRefundAccount = generateWallet();

        documentClient
          .put({
            TableName: HISTORY_TABLE,
            Item: {
              pk: `${ctx.from?.id}#CREATED_ACCOUNT`,
              sk: new Date().getTime(),
              privateKey,
              publicKey,
            },
          })
          .catch((e) => console.error('ERROR storing created account', e));

        documentClient
          .put({
            TableName: HISTORY_TABLE,
            Item: {
              pk: `${ctx.from?.id}#BOOSTED_ACCOUNT`,
              sk: new Date().getTime(),
              privateKey: boostedRefundAccount.privateKey,
              publicKey: boostedRefundAccount.publicKey,
            },
          })
          .catch((e) => console.error('ERROR storing boosted account', e));

        return {
          privateKey,
          publicKey,
          suiAsset: {
            type: LONG_SUI_COIN_TYPE,
            symbol: 'SUI',
            balance: '0',
            decimals: 9,
            noDecimals: false,
          },
          settings: {
            slippagePercentage: DEFAULT_SLIPPAGE,
            swapWithConfirmation: true,
            priceDifferenceThreshold: DEFAULT_PRICE_DIFFERENCE_THRESHOLD_PERCENTAGE,
          },
          assets: {
            currentIndex: 0,
            data: [],
          },
          welcomeBonus: {
            amount: WELCOME_BONUS_AMOUNT,
            isUserEligibleToGetBonus: true,
            isUserClaimedBonus: null,
            isUserAgreeWithBonus: null,
          },
          tradesCount: 0,
          createdAt: Date.now(),
          tradeCoin: {
            coinType: '',
            tradeAmountPercentage: '0',
            useSpecifiedCoin: false,
          },
          refund: {
            claimedBoostedRefund: false,
            walletBeforeBoostedRefundClaim: null,
            boostedRefundAmount: null,
            boostedRefundAccount,
          },
          trades: {},
          activeConversation: null,
        };
      },
      storage: enhanceStorage({
        storage,
        migrations: {
          1: addWelcomeBonus,
          2: enlargeDefaultSlippage,
          3: addTradeCoin,
          4: addBoostedRefund,
          5: addRefundFields,
          6: createBoostedRefundAccount(ctx),
          7: addTradesField,
          8: addSuiAssetField,
          9: addTradeAmountPercentageField,
          10: removeStep,
          11: addSwapConfirmationSetting,
          12: addPriceDifferenceThreshold,
          13: addIndexToAssets,
          14: addActiveConversation,
        },
      }),
    });
  });

  bot.api.config.use(autoRetry({ maxRetryAttempts: 1, retryOnInternalServerErrors: true }));

  protectedConversationsComposer.use(conversations());
  protectedConversationsComposer.use(checkActiveConversationVersion);
  useConversations(protectedConversationsComposer);

  bot.errorBoundary(generalErrorBoundaryHandler).use(conversationsComposer);

  composer.use(menu);

  bot.errorBoundary(generalErrorBoundaryHandler).use(composer);

  // TODO: Move these `command` calls to separated file like with `useCallbackQueries`
  bot.command('version', async (ctx) => {
    await ctx.reply(`Version ${APP_VERSION}`);
  });

  bot.command('buy', async (ctx) => {
    ctx.session.tradeCoin = {
      coinType: '',
      tradeAmountPercentage: '0',
      useSpecifiedCoin: false,
    };

    await enterConversation({ ctx, conversationId: CommonConversationId.Buy });
  });

  bot.command('sell', async (ctx) => {
    ctx.session.tradeCoin = {
      coinType: '',
      tradeAmountPercentage: '0',
      useSpecifiedCoin: false,
    };

    await enterConversation({ ctx, conversationId: CommonConversationId.Sell });
  });

  bot.command('withdrawal', async (ctx) => {
    await enterConversation({ ctx, conversationId: CommonConversationId.Withdraw });
  });

  bot.command('balances', async (ctx) => {
    await balances(ctx);
  });

  bot.command('createaftermathpool', async (ctx) => {
    await enterConversation({ ctx, conversationId: CommonConversationId.CreateAftermathPool });
  });

  // bot.command('createcetuspool', async (ctx) => {
  //   await enterConversation({ ctx, conversationId: CommonConversationId.CreateCetusPool });
  // });

  // bot.command('addcetuspoolliquidity', async (ctx) => {
  //   await enterConversation({ ctx, conversationId: CommonConversationId.AddCetusPoolLiquidity });
  // });

  bot.command('createcoin', async (ctx) => {
    await enterConversation({ ctx, conversationId: CommonConversationId.CreateCoin });
  });

  bot.command('start', async (ctx) => {
    await home(ctx);
  });

  bot.command('close', async (ctx) => {
    await ctx.conversation.exit();
  });

  // bot.command('importnewwallet', async (ctx) => {
  //   await enterConversation({ ctx, conversationId: CommonConversationId.ImportNewWallet });
  // });

  // Set commands suggestion
  await bot.api.setMyCommands([
    { command: 'start', description: 'Start the bot' },
    { command: 'version', description: 'Show the bot version' },
    { command: 'balances', description: 'Show your wallet balances' },
    { command: 'buy', description: 'Show buy menu' },
    { command: 'sell', description: 'Show sell menu' },
    { command: 'withdrawal', description: 'Show withdrawal menu' },
    {
      command: 'createaftermathpool',
      description: 'Create Aftermath liquidity pool',
    },
    { command: 'close', description: 'Hard close all conversations' },
    // {
    //   command: 'createcetuspool',
    //   description: 'Create Cetus concentrated liquidity pool',
    // },
    // {
    //   command: 'addcetuspoolliquidity',
    //   description: 'Add liquidity to Cetus pool',
    // },
    { command: 'createcoin', description: 'Create coin' },
    { command: 'createpool', description: 'Create liquidity pool' },
    { command: 'createcoin', description: 'Create coin' },
    // { command: 'importnewwallet', description: 'Import new wallet' },
  ]);

  useCallbackQueries(bot);

  // TODO: Move this to `useCallbackQueries`
  bot.callbackQuery('add-cetus-liquidity', async (ctx) => {
    await enterConversation({ ctx, conversationId: CommonConversationId.AddCetusPoolLiquidity });
    await ctx.answerCallbackQuery();
  });

  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
      console.error('Error in request:', e.description);
    } else if (e instanceof HttpError) {
      console.error('Could not contact Telegram:', e);
    } else {
      console.error('Unknown error:', e);
    }
  });

  if (ENVIRONMENT === 'local') {
    await bot.start();
  }
}

startBot();

export { bot };
