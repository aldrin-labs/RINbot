import { CoinAssetData } from '@avernikoz/rinbot-sui-sdk';
import {
  type Conversation,
  type ConversationFlavor,
} from '@grammyjs/conversations';
import type { ParseModeFlavor } from '@grammyjs/parse-mode';
import { Context, SessionFlavor } from 'grammy';
import { ExtendedDcaObject } from '../chains/dca/dca.types';

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
  assets: CoinAssetData[];
  dcas: {
    currentIndex: number | null;
    objects: ExtendedDcaObject[];
  };
  welcomeBonus: {
    amount: number;
    isUserEligibleToGetBonus: boolean;
    isUserAgreeWithBonus: boolean | null;
    isUserClaimedBonus: boolean | null;
  };
  tradesCount: number;
  createdAt: number;
}

export type BotContext = ParseModeFlavor<
  Context & SessionFlavor<SessionData> & ConversationFlavor
>;

export type MyConversation = Conversation<BotContext>;
