import { CoinAssetData } from '@avernikoz/rinbot-sui-sdk';
import {
  type Conversation,
  type ConversationFlavor,
} from '@grammyjs/conversations';
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
}

export type BotContext = Context &
  SessionFlavor<SessionData> &
  ConversationFlavor;

export type MyConversation = Conversation<BotContext>;
