import { CoinAssetData } from '@avernikoz/rinbot-sui-sdk';

export function addDCAsToUser(old: {
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
    dcas: { currentIndex: null, objects: [] },
  };
}
