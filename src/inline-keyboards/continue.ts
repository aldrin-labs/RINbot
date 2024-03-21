import { InlineKeyboard } from 'grammy';
import { CallbackQueryData } from '../types/callback-queries-data';

const continueKeyboard = new InlineKeyboard().text(
  'Continue',
  CallbackQueryData.Continue,
);

export default continueKeyboard;
