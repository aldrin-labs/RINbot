import { BotContext } from '../types';
import { Menu } from '@grammyjs/menu';

const help_menu = new Menu<BotContext>('help-menu').back('Close');

export default help_menu;
