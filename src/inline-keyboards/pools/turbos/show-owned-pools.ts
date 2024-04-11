import { InlineKeyboard } from 'grammy';
import { CallbackQueryData } from '../../../types/callback-queries-data';

const showOwnedTurbosPoolsKeyboard = new InlineKeyboard().text(
  'Show Owned Turbos Pools',
  CallbackQueryData.ShowOwnedTurbosPools,
);

export default showOwnedTurbosPoolsKeyboard;
