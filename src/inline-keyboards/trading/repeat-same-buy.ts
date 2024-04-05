import { InlineKeyboard } from 'grammy';
import { CallbackQueryData } from '../../types/callback-queries-data';

const repeatSameBuyKeyboard = new InlineKeyboard().text('Repeat', CallbackQueryData.RepeatSameBuy);

export default repeatSameBuyKeyboard;
