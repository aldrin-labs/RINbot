import { CoinAssetData } from '@avernikoz/rinbot-sui-sdk';
import { DEFAULT_SUI_ASSET } from '../chains/sui.config';

export function addSuiAssetField(old: {
  step:
    | 'main'
    | 'buy'
    | 'sell'
    | 'positions'
    | 'wallet'
    | 'wallet-deposit'
    | 'nft-menu';
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
    suiAsset: DEFAULT_SUI_ASSET,
  };
}
