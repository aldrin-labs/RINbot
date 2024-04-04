import { BotContext } from '../types';
import { Menu } from '@grammyjs/menu';

const alertsMenu = new Menu<BotContext>('alerts-menu').back('Close');

export default alertsMenu;
