import { CoinAssetData } from '@avernikoz/rinbot-sui-sdk';
import { DEFAULT_SLIPPAGE } from '../chains/slippage/percentages';

export function enlargeDefaultSlippage(old: {
  step: 'main' | 'buy' | 'sell' | 'positions' | 'wallet' | 'wallet-deposit' | 'nft-menu';
  privateKey: string;
  publicKey: string;
  settings: { slippagePercentage: number };
  assets: CoinAssetData[];
  welcomeBonus: {
    amount: number;
    isUserEligibleToGetBonus: boolean;
    isUserAgreeWithBonus: boolean | null;
    isUserClaimedBonus: boolean | null;
  };
  tradesCount: number;
  createdAt: number;
}) {
  return {
    ...old,
    settings: { slippagePercentage: DEFAULT_SLIPPAGE },
  };
}
