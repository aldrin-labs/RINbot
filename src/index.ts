import { Bot, Context, GrammyError, HttpError, session } from 'grammy';
import menu from './menu/main';
import { BotContext, SessionData } from './types';
// import SuiApiSingleton from './chains/sui';
import { conversations, createConversation } from '@grammyjs/conversations';
import { RedisAdapter } from '@grammyjs/storage-redis';
import { kv as instance } from '@vercel/kv';
import {
  buy,
  exportPrivateKey,
  generateWallet,
  home,
  sell,
  withdraw,
} from './chains/sui.functions';
import { timeoutMiddleware } from './middleware/timeoutMiddleware';

const APP_VERSION = '1.0.28';

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
  // const suiApi = (await SuiApiSingleton.getInstance()).getApi(); // Get SuiApiSingleton instance

  // Stores data per user.
  function getSessionKey(ctx: Context): string | undefined {
    // Give every user their personal session storage
    // (will be shared across groups and in their private chat)
    return ctx.from?.id.toString();
  }

  bot.use(timeoutMiddleware);
  // Make it interactive.
  bot.use(
    session({
      // getSessionKey,
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

  bot.use(createConversation(buy));
  bot.use(createConversation(sell));
  bot.use(createConversation(exportPrivateKey));
  bot.use(createConversation(withdraw));

  bot.use(menu);

  bot.command('version', async (ctx) => {
    await ctx.reply(`Version ${APP_VERSION}`);
  });

  bot.command('start', async (ctx) => {
    await home(ctx);
  });

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
