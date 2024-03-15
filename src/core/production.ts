import { VercelRequest, VercelResponse } from "@vercel/node";
import createDebug from "debug";

import { Bot } from "grammy";
import { BotContext } from "../types";
import { Update } from "grammy/types";

const debug = createDebug("bot:dev");

const PORT = (process.env.PORT && parseInt(process.env.PORT, 10)) || 3000;
const VERCEL_URL = `${process.env.VERCEL_URL}`;
// const VERCEL_URL = 'https://rinbot-dev.vercel.app'

const production = async (req: VercelRequest, res: VercelResponse, bot: Bot<BotContext>) => {
  debug("Bot runs in production mode");
  debug(`setting webhook: ${VERCEL_URL}`);

  if (!VERCEL_URL) {
    throw new Error("VERCEL_URL is not set.");
  }

  const getWebhookInfo = await bot.api.getWebhookInfo();
  if (getWebhookInfo.url !== VERCEL_URL + "/api") {
    debug(`deleting webhook ${VERCEL_URL}`);
    await bot.api.deleteWebhook();
    debug(`setting webhook: ${VERCEL_URL}/api`);
    await bot.api.setWebhook(`${VERCEL_URL}/api`);
  }

  if (req.method === "POST") {
    await bot.handleUpdate(req.body as unknown as Update);
  } else {
    res.status(200).json("Listening to bot events...");
  }
  debug(`starting webhook on port: ${PORT}`);
  // q.body as unknown as any, res);
  // } else {
  //   res.status(200).json('Listening to bot events...');
  // }
  debug(`starting webhook on port: ${PORT}`);
};
export { production };
