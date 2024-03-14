import { InlineKeyboard } from 'grammy';
import { CallbackQueryData } from '../types/callback-queries-data';

const closeConversation = new InlineKeyboard().text(
  'Cancel',
  CallbackQueryData.Cancel,
);

export default closeConversation;
