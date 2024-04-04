import { CoinAssetDataExtended } from '../types';

export function removeStep(old: {
  step: string;
  privateKey: string;
  publicKey: string;
  settings: { slippagePercentage: number };
  suiAsset: CoinAssetDataExtended;
  assets: CoinAssetDataExtended[];
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
    tradeAmountPercentage: string;
    useSpecifiedCoin: boolean;
  };
  refund: {
    claimedBoostedRefund: boolean;
    walletBeforeBoostedRefundClaim: {
      publicKey: string;
      privateKey: string;
    } | null;
    boostedRefundAmount: string | null;
    boostedRefundAccount: {
      publicKey: string;
      privateKey: string;
    } | null;
  };
  trades: { [coinType: string]: { lastTradeTimestamp: number } };
}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { step, ...remainingData } = old;

  return remainingData;
}
