import { Bot, session, GrammyError, HttpError, Context } from 'grammy';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { development, production } from './core';
import { BotContext, SessionData } from './types';
import menu from './menu/main';
// import SuiApiSingleton from './chains/sui';
import { conversations, createConversation } from '@grammyjs/conversations';
import { RedisAdapter } from '@grammyjs/storage-redis';
import { kv as instance } from '@vercel/kv';
import { buy, exportPrivateKey, generateWallet, home, sell, withdraw } from './chains/sui.functions';
import axios, { AxiosResponse } from 'axios'

if (instance && instance['opts']) {
  instance['opts'].automaticDeserialization = false;
}

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ENVIRONMENT = process.env.NODE_ENV || '';
const VERCEL_URL = process.env.WEBHOOK_URL || '';

// @ts-ignore
const storage = new RedisAdapter<SessionData>({ instance });

const bot = new Bot<BotContext>(BOT_TOKEN);

const setWebhook = async () => {
  let response: AxiosResponse = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`)
  if(response.data['result']['url'] === ''){
    response = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${VERCEL_URL}/api/webhook`)
    console.debug(response.data['ok']);
  }

}

if(ENVIRONMENT !== 'local')
  setWebhook()

async function startBot(): Promise<void> {
  
  console.debug('[startBot] triggered');
  // const suiApi = (await SuiApiSingleton.getInstance()).getApi(); // Get SuiApiSingleton instance


  // Stores data per user.
  function getSessionKey(ctx: Context): string | undefined {
    // Give every user their personal session storage
    // (will be shared across groups and in their private chat)
    return ctx.from?.id.toString();
  }

  // Make it interactive.
  bot.use(
    session({
      getSessionKey,
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
      storage
    }),
  );

  bot.use(conversations());

  bot.use(createConversation(buy));
  bot.use(createConversation(sell));
  bot.use(createConversation(exportPrivateKey));
  bot.use(createConversation(withdraw));

  bot.use(menu);

  bot.command('start', async (ctx) => {await home(ctx)});

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
