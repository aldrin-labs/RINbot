import { BotContext } from "../types";
import { Menu } from "@grammyjs/menu";

const settings_menu = new Menu<BotContext>("settings-menu").back("Close", (ctx) => {
  ctx.session.step = "main";
});

export default settings_menu;
