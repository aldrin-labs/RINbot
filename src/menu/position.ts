import { Menu } from '@grammyjs/menu';
import { home } from '../chains/sui.functions';
import { BotContext } from '../types';

const position_menu = new Menu<BotContext>('position')
    .back('Back')
    .text('Refresh')
    .row()
    .text('Slippage')
    .row()
    .text('Sell')

export default position_menu