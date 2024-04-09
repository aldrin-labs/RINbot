import { CoinAssetData } from '@avernikoz/rinbot-sui-sdk';
import { type Conversation, type ConversationFlavor } from '@grammyjs/conversations';
import { Context, SessionFlavor } from 'grammy';

// For PNL
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
  };
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
  }[];
}

export interface PriceApiPayload {
  data: {
    chainId: string;
    tokenAddress: string;
  }[];
}

export interface CoinAssetDataExtended extends CoinAssetData {
  price?: number;
  timestamp?: number;
  mcap?: number;
  priceChange1h?: number;
  priceChange24h?: number;
}

export interface SessionData {
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
}

export type BotContext = Context & SessionFlavor<SessionData> & ConversationFlavor;

export type MyConversation = Conversation<BotContext>;
