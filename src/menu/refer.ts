import { BotContext } from "../types";
import { Menu } from "@grammyjs/menu";

const referMenu = new Menu<BotContext>("refer-menu").back("Close", (ctx) => {
  ctx.session.step = "main";
});

export default referMenu;
