import { InlineKeyboard } from 'grammy';
import { CallbackQueryData } from '../../types/callback-queries-data';

const continueWithRefundKeyboard = new InlineKeyboard().text(
  'Continue With Refund',
  CallbackQueryData.ContinueWithRefund,
);

export default continueWithRefundKeyboard;
