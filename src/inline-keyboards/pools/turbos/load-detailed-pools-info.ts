import { InlineKeyboard } from 'grammy';
import { CallbackQueryData } from '../../../types/callback-queries-data';

const loadDetailedPoolsInfoKeyboard = new InlineKeyboard().text(
  'Load Detailed Info',
  CallbackQueryData.LoadDetailedPoolsInfo,
);

export default loadDetailedPoolsInfoKeyboard;
