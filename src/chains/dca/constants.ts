import { DCAManagerSingleton, SUI_DECIMALS } from '@avernikoz/rinbot-sui-sdk';
import BigNumber from 'bignumber.js';

export const MAX_TOTAL_ORDERS_COUNT = 1_000_000;
export const MIN_TOTAL_ORDERS_COUNT = 2;
export const MIN_ORDERS_COUNT_TO_ADD = 1;

// Note: This amount has taken from Jupiter.
// TODO: Research and fix in case it's required.
export const MIN_DCA_BASE_AMOUNT = '2';

export const MIN_SELL_USD_PER_ORDER = 1;

export const ONE_TRADE_GAS_FEE_IN_MIST =
  DCAManagerSingleton.DCA_MINIMUM_GAS_FUNDS;
export const ONE_TRADE_GAS_FEE_IN_SUI = new BigNumber(ONE_TRADE_GAS_FEE_IN_MIST)
  .dividedBy(10 ** SUI_DECIMALS)
  .toString();

export const DEFAULT_MIN_PRICE = '0';
export const DEFAULT_MAX_PRICE = '1000000000';
