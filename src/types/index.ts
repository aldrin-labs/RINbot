import { CoinAssetData } from '@avernikoz/rinbot-sui-sdk';
import {
  type Conversation,
  type ConversationFlavor,
} from '@grammyjs/conversations';
import { Context, SessionFlavor } from 'grammy';

//For PNL
export interface Trade {
  buyingPrice: number | null;
  sellingPrice: number | null;
  quantity: bigint;
  fees?: number;
}

export interface AxiosPriceApiResponseGet {
  data: {
    chainId: string;
    tokenAddress: string;
    timestamp: number;
    price: number;
    mcap: number | null;
    totalVolume: number | null;
    priceChange1h: number;
    priceChange24h: number;
    fecthedFrom: string;
  }
}

export interface AxiosPriceApiResponsePost {
  data: {
    chainId: string;
    tokenAddress: string;
    timestamp: number;
    price: number;
    mcap: number | null;
    totalVolume: number | null;
    priceChange1h: number;
    priceChange24h: number;
    fecthedFrom: string;
  }[]
}

export interface PriceApiPayload {
  data: {
    chainId: string,
    tokenAddress: string
  }[]
}

export interface CoinAssetDataExtended extends CoinAssetData {
  price?: number;
  timestamp?: number;
  mcap?: number,
  priceChange1h?: number
  priceChange24h?: number
}

export interface SessionData {
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
  assets: CoinAssetDataExtended[];
  chosenTokenType: string
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
}

export type BotContext = Context &
  SessionFlavor<SessionData> &
  ConversationFlavor;

export type MyConversation = Conversation<BotContext>;
