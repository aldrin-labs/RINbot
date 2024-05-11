import { CommonConversationId } from '../../chains/conversations.config';
import { buySurfdogTickets } from '../../chains/launchpad/surfdog/conversations/conversations';
import { SurfdogConversationId } from '../../chains/launchpad/surfdog/conversations/conversations.config';
import { checkProvidedAddress } from '../../chains/refunds/conversations/checkProvidedAddress';
import { createAftermathPool, createCoin, withdraw } from '../../chains/sui.functions';
import { buy, instantBuy } from '../../chains/trading/buy/buy';
import { sell } from '../../chains/trading/sell';
import { exportPrivateKey } from '../../chains/wallet/conversations/export-private-key';
import { welcomeBonusConversation } from '../../chains/welcome-bonus/welcomeBonus';
import { ConversationId } from '../../types/conversations';
import { ConversationData } from './types';

export const conversations: ConversationData[] = [
  { id: CommonConversationId.Buy, method: buy, version: 1 },
  { id: CommonConversationId.Sell, method: sell, version: 1 },
  { id: CommonConversationId.ExportPrivateKey, method: exportPrivateKey, version: 1 },
  { id: CommonConversationId.Withdraw, method: withdraw, version: 1 },
  { id: CommonConversationId.CreateAftermathPool, method: createAftermathPool, version: 1 },
  { id: CommonConversationId.CreateCoin, method: createCoin, version: 1 },
  { id: CommonConversationId.WelcomeBonus, method: welcomeBonusConversation, version: 1 },
  { id: CommonConversationId.CheckProvidedAddressForRefund, method: checkProvidedAddress, version: 1 },
  { id: CommonConversationId.InstantBuy, method: instantBuy, version: 1 },
  { id: SurfdogConversationId.BuySurfdogTickets, method: buySurfdogTickets, version: 1 },
];

export const conversationsMap: Record<ConversationId, ConversationData> = conversations.reduce(
  (map, convData) => {
    map[convData.id] = convData;
    return map;
  },
  {} as Record<ConversationId, ConversationData>,
);
