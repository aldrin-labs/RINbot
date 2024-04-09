import { InlineKeyboard } from 'grammy';
import { CallbackQueryData } from '../types/callback-queries-data';

const importWalletKeyboard = new InlineKeyboard().text('Import Wallet', CallbackQueryData.ImportWallet);

export default importWalletKeyboard;
