import { BotContext } from "../types";
import { Menu } from "@grammyjs/menu";

const deposit_menu = new Menu<BotContext>("wallet-deposit-menu").back("Close", async (ctx) => {
  //const last_msg = ctx.msg?.message_id as number;
  //const chat = await ctx.getChat();
  //console.log();
  //console.log('message_id', )
  //await ctx.deleteMessages([last_msg])
  ctx.session.step = "wallet";
  //ctx.menu.close();
});

export default deposit_menu;
