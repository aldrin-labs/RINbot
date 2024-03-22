import { InlineKeyboard } from 'grammy';
import { CallbackQueryData } from '../types/callback-queries-data';

const assets = new InlineKeyboard().text('Assets', CallbackQueryData.Assets);

export default assets;
