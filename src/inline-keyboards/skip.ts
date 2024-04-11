import { InlineKeyboard } from 'grammy';
import { CallbackQueryData } from '../types/callback-queries-data';

const skip = new InlineKeyboard().text('Skip', CallbackQueryData.Skip);

export default skip;
