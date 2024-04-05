import { InlineKeyboard } from 'grammy';
import { CallbackQueryData } from '../../types/callback-queries-data';

const coinWhitelistKeyboard = new InlineKeyboard().text('Coin Whitelist', CallbackQueryData.CoinWhitelist);

export default coinWhitelistKeyboard;
