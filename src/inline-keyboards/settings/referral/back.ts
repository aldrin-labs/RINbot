import { InlineKeyboard } from 'grammy';
import { CallbackQueryData } from '../../../types/callback-queries-data';

const backToMainReferralMenu = new InlineKeyboard().text('Back', CallbackQueryData.BackToMainReferralMenu);

export default backToMainReferralMenu;
