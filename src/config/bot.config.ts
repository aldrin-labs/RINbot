export const BOT_TOKEN = process.env.BOT_TOKEN || '';
export const ENVIRONMENT = process.env.NODE_ENV || '';
export const VERCEL_URL = process.env.WEBHOOK_URL || '';
export const BOT_PUBLIC_KEY = process.env.BOT_PUBLIC_KEY || '';
export const BOT_PRIVATE_KEY = process.env.BOT_PRIVATE_KEY || '';
export const ENABLE_WELCOME_BONUS = process.env.ENABLE_WELCOME_BONUS?.length && process.env.ENABLE_WELCOME_BONUS === 'true'
export const WELCOME_BONUS_AMOUNT = process.env.WELCOME_BONUS_AMOUNT && process.env.WELCOME_BONUS_AMOUNT.length && !isNaN(parseFloat(process.env.WELCOME_BONUS_AMOUNT)) && parseFloat(process.env.WELCOME_BONUS_AMOUNT) || 0;