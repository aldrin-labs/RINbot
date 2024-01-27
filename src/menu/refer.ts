import {BotContext} from '../types';
import { Menu } from "@grammyjs/menu";

const refer_menu = new Menu<BotContext>("refer-menu")
.back("Close", (ctx) => {ctx.session.step = "main"});

export default refer_menu;