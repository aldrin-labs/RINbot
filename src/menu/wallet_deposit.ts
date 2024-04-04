import { BotContext } from '../types';
import { Menu } from '@grammyjs/menu';

const depositMenu = new Menu<BotContext>('wallet-deposit-menu').back('Close');

export default depositMenu;
