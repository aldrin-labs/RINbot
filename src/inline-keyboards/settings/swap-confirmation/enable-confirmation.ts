import { InlineKeyboard } from 'grammy';
import { CallbackQueryData } from '../../../types/callback-queries-data';

const enableSwapConfirmationKeyboard = new InlineKeyboard().text('Enable', CallbackQueryData.EnableSwapConfirmation);

export default enableSwapConfirmationKeyboard;
