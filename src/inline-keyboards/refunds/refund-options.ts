import { InlineKeyboard } from 'grammy';
import { CallbackQueryData } from '../../types/callback-queries-data';

const refundOptionsKeyboard = new InlineKeyboard()
  .text('Base Refund', CallbackQueryData.BaseRefund)
  .text('Boosted Refund', CallbackQueryData.BoostedRefund);

export default refundOptionsKeyboard;
