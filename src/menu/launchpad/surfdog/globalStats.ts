import { Menu } from "@grammyjs/menu";
import { BotContext } from "../../../types";
import { showSurfdogPage } from "../../../chains/launchpad/surfdog/show-pages/showSurfdogPage";

const globalStatsMenu = new Menu<BotContext>("surfdog-global-stats").text("Back", async (ctx) => {
  await showSurfdogPage(ctx);
});

export default globalStatsMenu;
