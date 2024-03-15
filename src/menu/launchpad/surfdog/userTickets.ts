import { Menu } from "@grammyjs/menu";
import { SurfdogConversationId } from "../../../chains/launchpad/surfdog/conversations/conversations.config";
import { showSurfdogPage } from "../../../chains/launchpad/surfdog/show-pages/showSurfdogPage";
import { BotContext } from "../../../types";

const userTicketsMenu = new Menu<BotContext>("surfdog-user-tickets")
  .text("Buy Tickets", async (ctx) => {
    await ctx.conversation.enter(SurfdogConversationId.BuySurfdogTickets);
  })
  .text("Back", async (ctx) => {
    await showSurfdogPage(ctx);
  });

export default userTicketsMenu;
