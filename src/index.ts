import { Bot, session, GrammyError, HttpError } from "grammy";

import { VercelRequest, VercelResponse } from '@vercel/node';
import { development, production } from './core';

import { BotContext, SessionData } from './types';
import initRouter from './routers';

import menu from './menu/main';
import { SuiApi } from "./chains/sui";
import { conversations, createConversation } from "@grammyjs/conversations";


const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ENVIRONMENT = process.env.NODE_ENV || '';

const router = initRouter();
const bot = new Bot<BotContext>(BOT_TOKEN);

// Make it interactive.
bot.use(session({ initial: (): SessionData => {
  const {privateKey, publicKey} = SuiApi.generateWallet();
  return ({ step: "main", privateKey, publicKey })} 
}));


bot.use(conversations());

bot.use(createConversation(SuiApi.buy));

bot.use(menu);
bot.use(router);

bot.command("start", async (ctx) => {
  // Send the menu.
  await ctx.reply("Check out this menu:", { reply_markup: menu });
});


bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});
//prod mode (Vercel)
export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
  await production(req, res, bot);
};
//dev mode
ENVIRONMENT !== 'production' && development(bot);
