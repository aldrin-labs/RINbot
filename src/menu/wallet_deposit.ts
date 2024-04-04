import { BotContext } from '../types';
import { Menu } from '@grammyjs/menu';

const deposit_menu = new Menu<BotContext>('wallet-deposit-menu').back('Close');

export default deposit_menu;
