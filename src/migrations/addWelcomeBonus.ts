import { CoinAssetData } from '@avernikoz/rinbot-sui-sdk';
import { WELCOME_BONUS_AMOUNT } from '../config/bot.config';

export function addWelcomeBonus(old: {
  step:
    | 'main'
    | 'buy'
    | 'sell'
    | 'positions'
    | 'wallet'
    | 'wallet-deposit'
    | 'nft-menu'; // which step of the form we are on
  privateKey: string;
  publicKey: string;
  settings: { slippagePercentage: number };
  assets: CoinAssetData[];
}) {
  return {
    ...old,
    welcomeBonus: {
      amount: WELCOME_BONUS_AMOUNT,
      // We set false for old users
      isUserEligibleToGetBonus: false,
      isUserAgreeWithBonus: null,
    },
    tradesCount: 0,
    createdAt: Date.now(),
  };
}