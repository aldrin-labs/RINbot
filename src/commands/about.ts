import createDebug from "debug";

import { author, name, version } from "../../package.json";
import { BotContext } from "../types";

const debug = createDebug("bot:about_command");

const about = () => async (ctx: BotContext) => {
  const message = `*${name} ${version}*\n${author}`;
  debug(`Triggered "about" command with message \n${message}`);
  await ctx.reply(message, { parse_mode: "MarkdownV2" });
};

export { about };
