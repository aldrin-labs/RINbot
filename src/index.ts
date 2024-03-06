import { conversations, createConversation } from '@grammyjs/conversations';
import { RedisAdapter } from '@grammyjs/storage-redis';
import { kv as instance } from '@vercel/kv';
import { Bot, GrammyError, HttpError, session } from 'grammy';
import { ConversationId } from './chains/conversations.config';
import { buySurfdogTickets } from './chains/launchpad/surfdog/conversations/conversations';
import { SurfdogConversationId } from './chains/launchpad/surfdog/conversations/conversations.config';
import {
  buy,
  createCoin,
  createPool,
  exportPrivateKey,
  generateWallet,
  home,
  sell,
  withdraw,
} from './chains/sui.functions';
import menu from './menu/main';
import { useCallbackQueries } from './middleware/callbackQueries';
import { timeoutMiddleware } from './middleware/timeoutMiddleware';
import { BotContext, SessionData } from './types';
import { showSurfdogPage } from './chains/launchpad/surfdog/show-pages/showSurfdogPage';

const APP_VERSION = '1.1.1';

if (instance && instance['opts']) {
  instance['opts'].automaticDeserialization = false;
}

export const BOT_TOKEN = process.env.BOT_TOKEN || '';
export const ENVIRONMENT = process.env.NODE_ENV || '';
export const VERCEL_URL = process.env.WEBHOOK_URL || '';

const storage = new RedisAdapter<SessionData>({ instance });

const bot = new Bot<BotContext>(BOT_TOKEN);

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
          settings: { slippagePercentage: 10 },
          assets: [],
        };
      },
      storage,
    }),
  );

  bot.use(conversations());

  bot.use(createConversation(buy, { id: ConversationId.Buy }));
  bot.use(createConversation(sell, { id: ConversationId.Sell }));
  bot.use(
    createConversation(exportPrivateKey, {
      id: ConversationId.ExportPrivateKey,
    }),
  );
  bot.use(createConversation(withdraw, { id: ConversationId.Withdraw }));
  bot.use(createConversation(createPool, { id: ConversationId.CreatePool }));
  bot.use(createConversation(createCoin, { id: ConversationId.CreateCoin }));
  bot.use(
    createConversation(buySurfdogTickets, {
      id: SurfdogConversationId.BuySurfdogTickets,
    }),
  );

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

  bot.command('createpool', async (ctx) => {
    await ctx.conversation.enter(ConversationId.CreatePool);
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

  // Set commands suggestion
  await bot.api.setMyCommands([
    { command: 'start', description: 'Start the bot' },
    { command: 'version', description: 'Show the bot version' },
    { command: 'buy', description: 'Show buy menu' },
    { command: 'sell', description: 'Show sell menu' },
    { command: 'withdrawal', description: 'Show withdrawal menu' },
    { command: 'createpool', description: 'Create liquidity pool' },
    { command: 'createcoin', description: 'Create coin' },
    { command: 'surfdog', description: 'Enter into $SURFDOG launchpad' },
  ]);

  useCallbackQueries(bot);

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

startBot(); // Call the function to start the bot

//prod mode (Vercel)
// export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
//   await production(req, res, bot);
// };

export { bot };
