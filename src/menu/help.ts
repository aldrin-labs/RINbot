import { BotContext } from '../types';
import { Menu } from '@grammyjs/menu';

const helpMenu = new Menu<BotContext>('help-menu').back('Close');

export default helpMenu;
