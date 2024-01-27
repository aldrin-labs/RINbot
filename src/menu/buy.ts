import {BotContext} from '../types';
import { Menu } from "@grammyjs/menu";
import menu from './main';

const buy_menu = new Menu<BotContext>("buy-menu")
.back("Close", async (ctx) => {
    const last_msg = ctx.msg?.message_id as number;
    await ctx.deleteMessages([last_msg])
    ctx.session.step = "main";
    ctx.menu.close();
    ctx.reply("Check out this menu:", { reply_markup: menu })
});

export default buy_menu;