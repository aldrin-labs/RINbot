import { InlineKeyboard } from 'grammy';
import { CallbackQueryData } from '../../../types/callback-queries-data';

const createTurbosPoolKeyboard = new InlineKeyboard().text('Create Turbos Pool', CallbackQueryData.CreateTurbosPool);

export default createTurbosPoolKeyboard;
