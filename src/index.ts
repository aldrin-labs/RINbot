import { autoRetry } from '@grammyjs/auto-retry';
import { conversations, createConversation } from '@grammyjs/conversations';
import { RedisAdapter } from '@grammyjs/storage-redis';
import { kv as instance } from '@vercel/kv';
import {
  Bot,
  BotError,
  Composer,
  Enhance,
  GrammyError,
  HttpError,
  enhanceStorage,
  session,
} from 'grammy';
import { ConversationId } from './chains/conversations.config';
import { buySurfdogTickets } from './chains/launchpad/surfdog/conversations/conversations';
import { SurfdogConversationId } from './chains/launchpad/surfdog/conversations/conversations.config';
import { showSurfdogPage } from './chains/launchpad/surfdog/show-pages/showSurfdogPage';
import {
  createAftermathPool,
  createCoin,
  exportPrivateKey,
  generateWallet,
  home,
  withdraw,
} from './chains/sui.functions';
import { welcomeBonusConversation } from './chains/welcome-bonus/welcomeBonus';
import {
  BOT_TOKEN,
  ENVIRONMENT,
  WELCOME_BONUS_AMOUNT,
} from './config/bot.config';
import menu from './menu/main';
import { useCallbackQueries } from './middleware/callbackQueries';
import { timeoutMiddleware } from './middleware/timeoutMiddleware';
import { addBoostedRefund } from './migrations/addBoostedRefund';
import { addTradeCoin } from './migrations/addTradeCoin';
import { addWelcomeBonus } from './migrations/addWelcomeBonus';
import { enlargeDefaultSlippage } from './migrations/enlargeDefaultSlippage';
import { BotContext, SessionData } from './types';
import { buy, instantBuy } from './chains/trading/buy';
import { sell } from './chains/trading/sell';
import { LONG_SUI_COIN_TYPE } from '@avernikoz/rinbot-sui-sdk';
import { balances } from './commands/balances';


function errorBoundaryHandler(err: BotError) {
  console.error('[Error Boundary Handler]', err);
}

const APP_VERSION = '2.0.0';

if (instance && instance['opts']) {
  instance['opts'].automaticDeserialization = false;
}

const storage = new RedisAdapter<Enhance<SessionData>>({ instance });

const bot = new Bot<BotContext>(BOT_TOKEN);
const composer = new Composer<BotContext>();

async function startBot(): Promise<void> {
  console.debug('[startBot] triggered');
  composer.use(timeoutMiddleware);
  bot.use(
    session({
      initial: (): SessionData => {
        const { privateKey, publicKey } = generateWallet();
        return {
          step: 'main',
          privateKey,
          publicKey,
          suiAsset: {
            type: LONG_SUI_COIN_TYPE,
            symbol: 'SUI',
            balance: '0',
            decimals: 9,
            noDecimals: false
          },
          settings: { slippagePercentage: 20 },
          assets: [],
          welcomeBonus: {
            amount: WELCOME_BONUS_AMOUNT,
            isUserEligibleToGetBonus: true,
            isUserClaimedBonus: null,
            isUserAgreeWithBonus: null,
          },
          tradeAmount: '0',
          tradesCount: 0,
          createdAt: Date.now(),
          tradeCoin: {
            coinType: '',
            useSpecifiedCoin: false,
          },
          refund: {
            claimedBoostedRefund: false,
          },
        };
      },
      storage: enhanceStorage({
        storage,
        migrations: {
          1: addWelcomeBonus,
          2: enlargeDefaultSlippage,
          3: addTradeCoin,
          4: addBoostedRefund,
        },
      }),
    }),
  );

  bot.api.config.use(
    autoRetry({ maxRetryAttempts: 1, retryOnInternalServerErrors: true }),
  );

  composer.use(conversations());

  composer.use(createConversation(buy, { id: ConversationId.Buy }));
  composer.use(createConversation(instantBuy, { id: ConversationId.InstantBuy }));
  composer.use(createConversation(sell, { id: ConversationId.Sell }));
  composer.use(createConversation(balances, {id: ConversationId.Balances}));
  composer.use(
    createConversation(exportPrivateKey, {
      id: ConversationId.ExportPrivateKey,
    }),
  );
  composer.use(createConversation(withdraw, { id: ConversationId.Withdraw }));
  composer.use(
    createConversation(createAftermathPool, {
      id: ConversationId.CreateAftermathPool,
    }),
  );
  // composer.use(
  //   createConversation(addCetusLiquidity, {
  //     id: ConversationId.AddCetusPoolLiquidity,
  //   }),
  // );
  // composer.use(
  //   createConversation(createCetusPool, {
  //     id: ConversationId.CreateCetusPool,
  //   }),
  // );
  composer.use(
    createConversation(createCoin, { id: ConversationId.CreateCoin }),
  );
  composer.use(
    createConversation(buySurfdogTickets, {
      id: SurfdogConversationId.BuySurfdogTickets,
    }),
  );
  composer.use(
    createConversation(welcomeBonusConversation, {
      id: ConversationId.WelcomeBonus,
    }),
  );

  bot.errorBoundary(errorBoundaryHandler).use(composer);
  bot.use(menu);

  bot.command('version', async (ctx) => {
    await ctx.reply(`Version ${APP_VERSION}`);
  });

  bot.command('buy', async (ctx) => {
    await ctx.conversation.enter(ConversationId.Buy);
  });

  bot.command('sell', async (ctx) => {
    await ctx.conversation.enter(ConversationId.Sell);
  });

  bot.command('withdrawal', async (ctx) => {
    await ctx.conversation.enter(ConversationId.Withdraw);
  });

  bot.command('balances', async (ctx) => {
    await ctx.conversation.enter(ConversationId.Balances);
  });

  bot.command('createaftermathpool', async (ctx) => {
    await ctx.conversation.enter(ConversationId.CreateAftermathPool);
  });

  bot.command('createcetuspool', async (ctx) => {
    await ctx.conversation.enter(ConversationId.CreateCetusPool);
  });

  bot.command('addcetuspoolliquidity', async (ctx) => {
    await ctx.conversation.enter(ConversationId.AddCetusPoolLiquidity);
  });

  bot.command('createcoin', async (ctx) => {
    await ctx.conversation.enter(ConversationId.CreateCoin);
  });

  bot.command('surfdog', async (ctx) => {
    await showSurfdogPage(ctx);
  });

  bot.command('start', async (ctx) => {
    await home(ctx);
  });

  bot.command('close', async (ctx) => {
    await ctx.conversation.exit();
  });

  // Set commands suggestion
  await bot.api.setMyCommands([
    { command: 'start', description: 'Start the bot' },
    { command: 'version', description: 'Show the bot version' },
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
    { command: 'surfdog', description: 'Enter into $SURFDOG launchpad' },
  ]);

  useCallbackQueries(bot);

  bot.callbackQuery('add-cetus-liquidity', async (ctx) => {
    await ctx.conversation.enter(ConversationId.AddCetusPoolLiquidity);
    await ctx.answerCallbackQuery();
  });

  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    ctx.session.step = 'main';
    if (e instanceof GrammyError) {
      console.error('Error in request:', e.description);
    } else if (e instanceof HttpError) {
      console.error('Could not contact Telegram:', e);
    } else {
      console.error('Unknown error:', e);
    }
  });

  // bot.errorBoundary(errorBoundaryHandler)

  if(ENVIRONMENT === 'local'){ 
    await bot.start();
  }
}

startBot();

//prod mode (Vercel)
// export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
//   await production(req, res, bot);
// };

export { bot };
