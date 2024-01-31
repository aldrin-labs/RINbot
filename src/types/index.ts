import { Context, SessionFlavor } from 'grammy';
import {
  type Conversation,
  type ConversationFlavor,
  conversations,
  createConversation,
} from '@grammyjs/conversations';
import { CoinAssetData } from '@avernikoz/rinbot-sui-sdk';

export interface SessionData {
  step: 'main' | 'buy' | 'sell' | 'positions' | 'wallet' | 'wallet-deposit'; // which step of the form we are on
  privateKey: string;
  publicKey: string;
  settings: { slippagePercentage: number };
  assets: CoinAssetData[];
}

export type BotContext = Context &
  SessionFlavor<SessionData> &
  ConversationFlavor;

export type MyConversation = Conversation<BotContext>;
