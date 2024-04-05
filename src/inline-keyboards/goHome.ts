import { InlineKeyboard } from 'grammy';
import { CallbackQueryData } from '../types/callback-queries-data';

const goHome = new InlineKeyboard().text('Home', CallbackQueryData.Home);

export default goHome;
