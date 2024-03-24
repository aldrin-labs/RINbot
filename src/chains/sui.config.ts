import { LONG_SUI_COIN_TYPE, SUI_DECIMALS } from '@avernikoz/rinbot-sui-sdk';
import { CoinAssetDataExtended } from '../types';

export const SUI_PROVIDER_URL =
  'https://sui-mainnet.blastapi.io/55fade13-b920-4956-bd54-d7ab2311776e';

export const SUI_LIQUIDITY_PROVIDERS_CACHE_OPTIONS = {
  updateIntervalInMs: 1000 * 60 * 60,
};

export const RINCEL_COIN_TYPE =
  '0xd2c7943bdb372a25c2ac7fa6ab86eb9abeeaa17d8d65e7dcff4c24880eac860b::rincel::RINCEL';

export const DEFAULT_SUI_ASSET: CoinAssetDataExtended = {
  type: LONG_SUI_COIN_TYPE,
  symbol: 'SUI',
  balance: '0',
  decimals: SUI_DECIMALS,
  noDecimals: false,
};

export const EXAMPLE_COIN_TYPE = RINCEL_COIN_TYPE;
