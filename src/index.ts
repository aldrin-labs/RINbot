import { conversations, createConversation } from '@grammyjs/conversations';
import { hydrateReply } from '@grammyjs/parse-mode';
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
import { createDca } from './chains/dca/conversations/create-dca';
import { depositDcaBase } from './chains/dca/conversations/deposit-base';
import { withdrawDcaBase } from './chains/dca/conversations/withdraw-base';
import { buySurfdogTickets } from './chains/launchpad/surfdog/conversations/conversations';
import { SurfdogConversationId } from './chains/launchpad/surfdog/conversations/conversations.config';
import { showSurfdogPage } from './chains/launchpad/surfdog/show-pages/showSurfdogPage';
import { addCetusLiquidity } from './chains/pools/cetus/add-liquidity';
import { createCetusPool } from './chains/pools/cetus/create';
import {
  buy,
  createAftermathPool,
  createCoin,
  exportPrivateKey,
  generateWallet,
  home,
  sell,
  withdraw,
} from './chains/sui.functions';
import menu from './menu/main';
import { useCallbackQueries } from './middleware/callbackQueries';
import { timeoutMiddleware } from './middleware/timeoutMiddleware';
import { addDCAsToUser } from './migrations/addDCAs';
import { BotContext, SessionData } from './types';
import {
  BOT_TOKEN,
  ENVIRONMENT,
  WELCOME_BONUS_AMOUNT,
} from './config/bot.config';
import { addWelcomeBonus } from './migrations/addWelcomeBonus';
import { welcomeBonusConversation } from './chains/welcome-bonus/welcomeBonus';
import { autoRetry } from '@grammyjs/auto-retry';
import { enlargeDefaultSlippage } from './migrations/enlargeDefaultSlippage';
import { increaseOrders } from './chains/dca/conversations/increase-orders';
import { closeDca } from './chains/dca/conversations/close-dca';

const APP_VERSION = '1.1.3';

if (instance && instance['opts']) {
  instance['opts'].automaticDeserialization = false;
}

const storage = new RedisAdapter<Enhance<SessionData>>({ instance });

const bot = new Bot<BotContext>(BOT_TOKEN);
const composer = new Composer<BotContext>();

async function startBot(): Promise<void> {
  console.debug('[startBot] triggered');

  bot.use(timeoutMiddleware);
  bot.use(
    session({
      initial: (): SessionData => {
        const { privateKey, publicKey } = generateWallet();
        return {
          step: 'main',
          privateKey,
          publicKey,
          settings: { slippagePercentage: 20 },
          assets: [],
          dcas: { currentIndex: null, objects: [] },
          welcomeBonus: {
            amount: WELCOME_BONUS_AMOUNT,
            isUserEligibleToGetBonus: true,
            isUserClaimedBonus: null,
            isUserAgreeWithBonus: null,
          },
          tradesCount: 0,
          createdAt: Date.now(),
        };
      },
      storage: enhanceStorage({
        storage,
        migrations: {
          1: addWelcomeBonus,
          2: enlargeDefaultSlippage,
          3: addDCAsToUser,
        },
      }),
    }),
  );

  bot.api.config.use(
    autoRetry({ maxRetryAttempts: 1, retryOnInternalServerErrors: true }),
  );
  bot.use(hydrateReply);

  composer.use(conversations());

  composer.use(createConversation(buy, { id: ConversationId.Buy }));
  composer.use(createConversation(sell, { id: ConversationId.Sell }));
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
  composer.use(createConversation(createDca, { id: ConversationId.CreateDca }));
  composer.use(
    createConversation(depositDcaBase, { id: ConversationId.DepositDcaBase }),
  );
  composer.use(
    createConversation(withdrawDcaBase, { id: ConversationId.WithdrawDcaBase }),
  );
  composer.use(
    createConversation(increaseOrders, {
      id: ConversationId.IncreaseDcaOrders,
    }),
  );
  composer.use(createConversation(closeDca, { id: ConversationId.CloseDca }));
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
  bot.errorBoundary(boundaryHandler).use(composer);

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

  bot.command('createdca', async (ctx) => {
    await ctx.conversation.enter(ConversationId.CreateDca);
  });

  // TODO: Remove this before merge, that's needed for tests only
  bot.command('depositdcabase', async (ctx) => {
    await ctx.conversation.enter(ConversationId.DepositDcaBase);
  });

  // TODO: Remove this before merge, that's needed for tests only
  bot.command('withdrawdcabase', async (ctx) => {
    await ctx.conversation.enter(ConversationId.WithdrawDcaBase);
  });

  // TODO: Remove this before merge, that's needed for tests only
  bot.command('increasedcaorders', async (ctx) => {
    await ctx.conversation.enter(ConversationId.IncreaseDcaOrders);
  });

  // TODO: Remove this before merge, that's needed for tests only
  bot.command('closedca', async (ctx) => {
    await ctx.conversation.enter(ConversationId.CloseDca);
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
    { command: 'createdca', description: 'Create DCA' },
    { command: 'surfdog', description: 'Enter into $SURFDOG launchpad' },
    // TODO: Remove this before merge, that's needed for tests only
    {
      command: 'withdrawdcabase',
      description: 'Withdraw base coin from selected DCA',
    },
    // TODO: Remove this before merge, that's needed for tests only
    {
      command: 'increasedcaorders',
      description: 'Increase orders count for selected DCA',
    },
    // TODO: Remove this before merge, that's needed for tests only
    {
      command: 'closedca',
      description: 'Close selected DCA',
    },
    // TODO: Remove this before merge, that's needed for tests only
    {
      command: 'depositdcabase',
      description: 'Deposit base coin to selected DCA',
    },
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

  ENVIRONMENT === 'local' && bot.start();
}

startBot();

//prod mode (Vercel)
// export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
//   await production(req, res, bot);
// };

function boundaryHandler(err: BotError) {
  console.error('[Error Boundary]', err);
}

export { bot };
