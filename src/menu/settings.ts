import { BotContext } from "../types";
import { Menu } from "@grammyjs/menu";

const settingsMenu = new Menu<BotContext>("settings-menu").back("Close", (ctx) => {
  ctx.session.step = "main";
});

export default settingsMenu;
