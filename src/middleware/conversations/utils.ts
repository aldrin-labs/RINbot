import { BotContext } from '../../types';
import { ConversationId } from '../../types/conversations';
import { conversationsMap } from './config';

/**
 * Use this method to safely enter the conversation. It stores the given conversation data to the
 * `session.activeConversation` field.
 */
export async function enterConversation({ conversationId, ctx }: { ctx: BotContext; conversationId: ConversationId }) {
  const { id, version } = conversationsMap[conversationId];

  ctx.session.activeConversation = { id, version };

  await ctx.conversation.enter(id);
}
