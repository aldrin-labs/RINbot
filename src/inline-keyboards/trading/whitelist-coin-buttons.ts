import { InlineKeyboard } from 'grammy';
import { getWhitelistCoinCallbackQueryData } from '../../chains/coin-whitelist/utils';
import whitelist from '../../storage/coin-whitelist';
import { shouldBeRowAfterButton } from '../utils';

export const coinCallbackQueriesData = whitelist.map((coinData, index) => getWhitelistCoinCallbackQueryData(index));

const whitelistCoinsKeyboard = new InlineKeyboard();

whitelist.map(({ symbol }, index) => {
  const callbackQueryData = coinCallbackQueriesData[index];
  whitelistCoinsKeyboard.text(symbol, callbackQueryData);

  if (shouldBeRowAfterButton(index, 5)) {
    whitelistCoinsKeyboard.row();
  }
});

export default whitelistCoinsKeyboard;
