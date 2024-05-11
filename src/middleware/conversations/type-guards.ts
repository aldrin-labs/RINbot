import { CommonConversationId } from '../../chains/conversations.config';
import { SurfdogConversationId } from '../../chains/launchpad/surfdog/conversations/conversations.config';
import { ConversationId } from '../../types/conversations';

export function isConversationId(str: string): str is ConversationId {
  const conversationIds = [...Object.values(CommonConversationId), ...Object.values(SurfdogConversationId)];

  return conversationIds.includes(str as ConversationId);
}
