import {BotContext} from '../types';
import { Menu } from "@grammyjs/menu";
import menu from './main';


const withdraw_menu = new Menu<BotContext>("wallet-withdraw-menu")
.back("Close", async (ctx) => {
    await ctx.conversation.exit();
    const last_msg = ctx.msg?.message_id as number;
    await ctx.deleteMessages([last_msg])
    ctx.session.step = "main";
    ctx.menu.close();
    await ctx.reply("Check out this menu:", { reply_markup: menu })
});

export default withdraw_menu;