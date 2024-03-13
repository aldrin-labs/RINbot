import { SUI_DECIMALS } from '@avernikoz/rinbot-sui-sdk';
import BigNumber from 'bignumber.js';

export const MAX_TOTAL_ORDERS_COUNT = 1_000_000;
export const MIN_TOTAL_ORDERS_COUNT = 2;

// Note: This amount has taken from Jupiter.
// TODO: Research and fix in case it's required.
export const MIN_DCA_BASE_AMOUNT = '2';

export const MIN_SELL_USD_PER_ORDER = 1;

// TODO: Get this value from SDK
export const ONE_TRADE_GAS_FEE_IN_MIST = 25_000_000;
export const ONE_TRADE_GAS_FEE_IN_SUI = new BigNumber(ONE_TRADE_GAS_FEE_IN_MIST)
  .dividedBy(10 ** SUI_DECIMALS)
  .toString();
