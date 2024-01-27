import {BotContext} from '../types';
import { Menu } from "@grammyjs/menu";

const positions_menu = new Menu<BotContext>("positions-menu")
.back("Close", (ctx) => {ctx.session.step = "main"});

export default positions_menu;