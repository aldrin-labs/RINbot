import { BotContext } from "../types";
import { Menu } from "@grammyjs/menu";

const depositMenu = new Menu<BotContext>("wallet-deposit-menu").back("Close", async (ctx) => {
  // const lastMsg = ctx.msg?.message_id as number;
  // const chat = await ctx.getChat();
  // console.log();
  // console.log('message_id', )
  // await ctx.deleteMessages([lastMsg])
  ctx.session.step = "wallet";
  // ctx.menu.close();
});

export default depositMenu;
