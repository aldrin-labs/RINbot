import { ConversationFn } from '@grammyjs/conversations';
import { BotContext } from '../../types';
import { ConversationId } from '../../types/conversations';

export type ConversationData = {
  id: ConversationId;
  method: ConversationFn<BotContext>;
  version: number;
};
