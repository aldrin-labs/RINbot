import { InlineKeyboard } from 'grammy';
import { CallbackQueryData } from '../types/callback-queries-data';

const exportPrivateKeyKeyboard = new InlineKeyboard().text(
  'Export Private Key',
  CallbackQueryData.ExportPrivateKey,
);

export default exportPrivateKeyKeyboard;
