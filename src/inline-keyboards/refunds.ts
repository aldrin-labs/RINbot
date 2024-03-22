import { InlineKeyboard } from 'grammy';
import { CallbackQueryData } from '../types/callback-queries-data';

const refundsKeyboard = new InlineKeyboard().text(
  'Refunds',
  CallbackQueryData.Refunds,
);

export default refundsKeyboard;
