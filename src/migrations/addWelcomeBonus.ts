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
      // It's an agreement with user
      isUserAgreeWithBonus: null,
      // Users who take the bonus, can be false in case of the failure on RPC or welcome bonus account is empty
      isUserClaimedBonus: null,

    },
    tradesCount: 0,
    createdAt: Date.now(),
  };
}