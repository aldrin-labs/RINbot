export const BOT_TOKEN = process.env.BOT_TOKEN || '';
export const ENVIRONMENT = process.env.NODE_ENV || '';
export const VERCEL_URL = process.env.WEBHOOK_URL || '';
export const BOT_PRIVATE_KEY = process.env.BOT_PRIVATE_KEY || '';
export const ENABLE_WELCOME_BONUS =
  process.env.ENABLE_WELCOME_BONUS?.length &&
  process.env.ENABLE_WELCOME_BONUS === 'true';
// The WELCOME_BONUS_AMOUNT should respect decimals, e.g. for 1 SUI it should be set just to "1", not a "1_000_000_000" MIST
export const WELCOME_BONUS_AMOUNT =
  (process.env.WELCOME_BONUS_AMOUNT &&
    process.env.WELCOME_BONUS_AMOUNT.length &&
    !isNaN(parseFloat(process.env.WELCOME_BONUS_AMOUNT)) &&
    parseFloat(process.env.WELCOME_BONUS_AMOUNT)) ||
  0;
export const WELCOME_BONUS_MIN_TRADES_LIMIT = 15;
export const EXTERNAL_WALLET_ADDRESS_TO_STORE_FEES =
  process.env.EXTERNAL_WALLET_ADDRESS_TO_STORE_FEES || '';
export const PRICE_API_URL = process.env.PRICE_API_URL || '';
export const ALDRIN_AUTHORITY = process.env.ALDRIN_AUTHORITY || '';
export const imgs = [
  'src/imgs/aldirn1.jpg',
  'src/imgs/aldrin2.jpg',
  'src/imgs/rincel2.jpg',
  'src/imgs/rincel1.jpg'
]