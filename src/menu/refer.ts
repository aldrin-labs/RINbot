import { BotContext } from '../types';
import { Menu } from '@grammyjs/menu';

const referMenu = new Menu<BotContext>('refer-menu').back('Close');

export default referMenu;
