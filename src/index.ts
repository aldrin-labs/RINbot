import { Bot, session, GrammyError, HttpError, Context } from "grammy";
import { VercelRequest, VercelResponse } from '@vercel/node';
import { development, production } from './core';
import { BotContext, SessionData } from './types';
import menu from './menu/main';
import SuiApiSingleton from './chains/sui';
import { conversations, createConversation } from '@grammyjs/conversations';
import { RedisAdapter } from '@grammyjs/storage-redis';
import { kv as instance } from "@vercel/kv";

if (instance && instance['opts']) {
  instance['opts'].automaticDeserialization = false
}

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ENVIRONMENT = process.env.NODE_ENV || '';
const VERCEL_URL = process.env.VERCEL_URL || '';

// @ts-ignore
const storage = new RedisAdapter({ instance });

const bot = new Bot<BotContext>(BOT_TOKEN);

if(ENVIRONMENT !== 'local')
  void bot.api.setWebhook(`${VERCEL_URL}/api/webhook`)

async function startBot(): Promise<void> {
  console.debug("[startBot] triggered")
  const suiApi = await (await SuiApiSingleton.getInstance()).getApi(); // Get SuiApiSingleton instance

  // Stores data per user.
  function getSessionKey(ctx: Context): string | undefined {
    // Give every user their personal session storage
    // (will be shared across groups and in their private chat)
    return ctx.from?.id.toString();
  }

  // Make it interactive.
  bot.use(session({ 
    getSessionKey,
    initial: (): SessionData => {
      const {privateKey, publicKey} = suiApi.generateWallet();
      return ({ step: "main", privateKey, publicKey, settings: { slippagePercentage: 10 } })
    },
    storage
  }));

  bot.use(conversations());

  bot.use(createConversation(suiApi.buy));
  bot.use(createConversation(suiApi.sell));
  bot.use(createConversation(suiApi.exportPrivateKey));
  bot.use(createConversation(suiApi.withdraw));

  bot.use(menu);

  bot.command('start', async (ctx) => {
    // Send the menu.
    const balance = await suiApi.balance(ctx);
    const avl_balance = await suiApi.availableBalance(ctx);
    const welcome_text = `Welcome to RINbot on Sui Network\n Your wallet address: ${ctx.session.publicKey} \n
    Your SUI balance: ${balance}\n
    Your available SUI balance: ${avl_balance}\n
    Total amount of assets: ${0}\n
    Total wallet net worth: $${0}`;
    await ctx.reply(welcome_text, { reply_markup: menu });
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

  ENVIRONMENT === 'local' && bot.start()
}

startBot() // Call the function to start the bot


//prod mode (Vercel)
// export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
//   await production(req, res, bot);
// };


export { bot }
