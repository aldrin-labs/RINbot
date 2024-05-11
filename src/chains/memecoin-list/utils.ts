import { MEMECHAN_LIVE_COIN_CALLBACK_QUERY_DATA_PREFIX } from './config';

export function getMemechanCoinCallbackQueryData(coinIndex: number): string {
  return `${MEMECHAN_LIVE_COIN_CALLBACK_QUERY_DATA_PREFIX}${coinIndex}`;
}

export function getMemechanCoinIndexFromCallbackQueryData(callbackQueryData: string): number {
  const prefixLength = MEMECHAN_LIVE_COIN_CALLBACK_QUERY_DATA_PREFIX.length;

  return +callbackQueryData.substring(prefixLength);
}
