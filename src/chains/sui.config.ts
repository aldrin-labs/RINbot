import { LONG_SUI_COIN_TYPE, SUI_DECIMALS } from '@avernikoz/rinbot-sui-sdk';

export const SUI_PROVIDER_URL = 'https://sui-mainnet.blastapi.io/55fade13-b920-4956-bd54-d7ab2311776e';

export const SUI_LIQUIDITY_PROVIDERS_CACHE_OPTIONS = {
  updateIntervalInMs: 1000 * 60 * 60,
};

export const RINCEL_COIN_TYPE = '0xd2c7943bdb372a25c2ac7fa6ab86eb9abeeaa17d8d65e7dcff4c24880eac860b::rincel::RINCEL';

export const COIN_WHITELIST_URL = 'https://rinbot-dev.vercel.app/api/coin-whitelist';

export const RINBOT_CHAT_URL = 'https://t.me/rinbot_chat';

export const RINBOT_URL = 'https://t.me/RINsui_bot';

export const RINBOT_LOGO_URL = 'https://i.ibb.co/BNQHQPt/rinbot-logo-2-edge-blur-min.png';

export const SELL_DELAY_AFTER_BUY_FOR_CLAIMERS_IN_MS = 4 * 60 * 60 * 1000; // 4 hours

export const SUI_COIN_DATA = { symbol: 'SUI', decimals: SUI_DECIMALS, type: LONG_SUI_COIN_TYPE };
