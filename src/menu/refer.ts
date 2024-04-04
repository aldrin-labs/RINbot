import { BotContext } from '../types';
import { Menu } from '@grammyjs/menu';

const refer_menu = new Menu<BotContext>('refer-menu').back('Close');

export default refer_menu;
