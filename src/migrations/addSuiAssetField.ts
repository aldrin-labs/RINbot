import { CoinAssetData, LONG_SUI_COIN_TYPE } from '@avernikoz/rinbot-sui-sdk';

export function addSuiAssetField(old: {
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
    walletBeforeBoostedRefundClaim: {
      publicKey: string;
      privateKey: string;
    } | null;
    boostedRefundAmount: string | null;
    boostedRefundAccount: string | null;
  };
}) {
  return {
    ...old,
    suiAsset: {
      type: LONG_SUI_COIN_TYPE,
      symbol: 'SUI',
      balance: '0',
      decimals: 9,
      noDecimals: false,
    },
  };
}
