import { CommonConversationId } from '../chains/conversations.config';
import { SurfdogConversationId } from '../chains/launchpad/surfdog/conversations/conversations.config';

export type ConversationId = CommonConversationId | SurfdogConversationId;
