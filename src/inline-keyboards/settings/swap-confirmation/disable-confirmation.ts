import { InlineKeyboard } from 'grammy';
import { CallbackQueryData } from '../../../types/callback-queries-data';

const disableSwapConfirmationKeyboard = new InlineKeyboard().text('Disable', CallbackQueryData.DisableSwapConfirmation);

export default disableSwapConfirmationKeyboard;
