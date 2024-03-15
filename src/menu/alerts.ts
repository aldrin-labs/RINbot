import { BotContext } from "../types";
import { Menu } from "@grammyjs/menu";

const alerts_menu = new Menu<BotContext>("alerts-menu").back("Close", (ctx) => {
  ctx.session.step = "main";
});

export default alerts_menu;
