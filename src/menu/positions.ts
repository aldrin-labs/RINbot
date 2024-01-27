import {BotContext} from '../types';
import { Menu } from "@grammyjs/menu";

const positions_menu = new Menu<BotContext>("positions-menu")
.back("Close", (ctx) => {ctx.session.step = "main"}).row()
.text('buy X amount', (ctx) => ctx.reply("buy X")).row()
.text('<', (ctx) => ctx.reply("prev")).text('current ticker').text('>', (ctx) => ctx.reply("next")).row()
.text('sell 25%', (ctx) => ctx.reply("sell 25%")).text('sell 100%', (ctx) => ctx.reply("sell 100%")).text('sell X%', (ctx) => ctx.reply("sell X%")).row()
.url('explorer', "https://suiscan.io").url('dexscreener', "https://dexscreener.io").url('scan', '@ttfbotbot').url('chart', '@ttfbotbot').row()
.text('refresh', (ctx) => ctx.reply("prev"));


export default positions_menu;