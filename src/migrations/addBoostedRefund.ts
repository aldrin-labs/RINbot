import { CoinAssetData } from '@avernikoz/rinbot-sui-sdk';

export function addBoostedRefund(old: {
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
  tradeCoin: {
    coinType: string;
    useSpecifiedCoin: boolean;
  };
}) {
  return {
    ...old,
    refund: {
      claimedBoostedRefund: false,
    },
  };
}
