import { InlineKeyboard } from 'grammy';
import { CallbackQueryData } from '../types/callback-queries-data';

const refundOptionsKeyboard = new InlineKeyboard()
  .text('Full Refund', CallbackQueryData.FullRefund)
  .text('Enhanced Refund', CallbackQueryData.EnhancedRefund);

export default refundOptionsKeyboard;
