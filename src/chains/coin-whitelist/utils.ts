import { WHITELIST_COIN_CALLBACK_QUERY_DATA_PREFIX } from './config';

export function getWhitelistCoinCallbackQueryData(coinIndex: number): string {
  return `${WHITELIST_COIN_CALLBACK_QUERY_DATA_PREFIX}${coinIndex}`;
}

export function getWhitelistCoinIndexFromCallbackQueryData(callbackQueryData: string): number {
  const prefixLength = WHITELIST_COIN_CALLBACK_QUERY_DATA_PREFIX.length;

  return +callbackQueryData.substring(prefixLength);
}
