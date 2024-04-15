import { CommonCoinData, getSuiProvider } from '@avernikoz/rinbot-sui-sdk';
import { getCetus } from './sui.functions';

export type SuiClient = ReturnType<typeof getSuiProvider>;

export type SuiTransactionBlockResponse = Awaited<ReturnType<SuiClient['signAndExecuteTransactionBlock']>>;

export type CoinForPool = CommonCoinData & { balance: string };

export type CetusPool = Exclude<Awaited<ReturnType<Awaited<ReturnType<typeof getCetus>>['getPool']>>, null>;

export type CoinWhitelistItem = {
  symbol: string;
  type: string;
};
