import { CoinAssetData } from '@avernikoz/rinbot-sui-sdk';
import { WELCOME_BONUS_AMOUNT } from '../config/bot.config';

export function increaseSlippageDefault(old: {
  step: 'main' | 'buy' | 'sell' | 'positions' | 'wallet' | 'wallet-deposit' | 'nft-menu';
  privateKey: string;
  publicKey: string;
  settings: { slippagePercentage: number };
  assets: CoinAssetData[];
  welcomeBonus: { amount: number, isUserEligibleToGetBonus: boolean, isUserAgreeWithBonus: boolean | null, isUserClaimedBonus: boolean | null }
  tradesCount: number
  createdAt: number
}) {
  return {
    ...old,
    settings: { slippagePercentage: 20 },
  };
}