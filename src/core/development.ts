import createDebug from "debug";
import { Bot } from "grammy";
import { BotContext } from "../types";

const debug = createDebug("bot:dev");

const development = async (bot: Bot<BotContext>) => {
  // const botInfo = (await bot.telegram.getMe()).username;

  debug("Bot runs in development mode");
  // debug(`${botInfo} deleting webhook`);
  // await bot.telegram.deleteWebhook();
  // debug(`${botInfo} starting polling`);

  bot.start();

  process.once("SIGINT", () => bot.stop());
  process.once("SIGTERM", () => bot.stop());
};

export { development };
