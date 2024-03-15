import { BotContext } from "../types";
import { Menu } from "@grammyjs/menu";

const help_menu = new Menu<BotContext>("help-menu").back("Close", (ctx) => {
  ctx.session.step = "main";
});

export default help_menu;
