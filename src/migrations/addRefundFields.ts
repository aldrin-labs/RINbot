import { CoinAssetData } from '@avernikoz/rinbot-sui-sdk';

export function addRefundFields(old: {
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
  refund: {
    claimedBoostedRefund: boolean;
  };
}) {
  return {
    ...old,
    refund: {
      ...old.refund,
      walletBeforeBoostedRefundClaim: null,
      boostedRefundAmount: null,
      boostedRefundAccount: null,
    },
  };
}
