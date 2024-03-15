import userTicketsMenu from "../../../../menu/launchpad/surfdog/userTickets";
import { BotContext } from "../../../../types";

export async function showRules(ctx: BotContext) {
  let rulesString = `<b>Rules</b>:\n\n`;
  rulesString += `• There are always 4 winners every lottery\n`;
  rulesString += `• The game lasts until all tokens are distributed\n`;
  rulesString += `• There are no refunds\n`;
  rulesString += `• One lottery every second`;

  await ctx.reply(rulesString, {
    reply_markup: userTicketsMenu,
    parse_mode: "HTML",
  });
}
