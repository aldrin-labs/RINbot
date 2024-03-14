import { DCAObject } from '@avernikoz/rinbot-sui-sdk';

export type ExtendedDcaObject = DCAObject & {
  fields: {
    base_coin_symbol: string;
    quote_coin_symbol: string;
    base_coin_decimals: number;
  };
};
