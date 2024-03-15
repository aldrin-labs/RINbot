import createDebug from "debug";

const debug = createDebug("bot:dev");

const development = async (bot: any) => {
  //const botInfo = (await bot.telegram.getMe()).username;

  debug("Bot runs in development mode");
  //debug(`${botInfo} deleting webhook`);
  //await bot.telegram.deleteWebhook();
  //debug(`${botInfo} starting polling`);

  bot.start();

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
};

export { development };
