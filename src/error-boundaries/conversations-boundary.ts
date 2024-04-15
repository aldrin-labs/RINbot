import { BotError } from 'grammy';
import { EndConversationError } from '../errors/end-conversation.error';

/**
 * Error boundary which should be used to handle errors from all the registered conversations.
 */
export async function conversationErrorBoundaryHandler(error: BotError) {
  if (error.error instanceof EndConversationError) {
    /**
     * In case error is `EndConversationError`, we ignore it and let user work further, because this error is thrown
     * only to end conversation from inside (ref: https://grammy.dev/plugins/conversations#leaving-a-conversation).
     * This is a workaround for exiting the conversation from any its point (e.g. buy util method, etc.)
     */
    return;
  } else {
    console.debug('[Conversation Error Boundary] Unrecognized error occured, throwing further...');
    throw error;
  }
}
