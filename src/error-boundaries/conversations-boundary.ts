import { BotError } from 'grammy';
import { EndConversationError } from '../errors/end-conversation.error';

/**
 * Error boundary which should be used to handle errors from all the registered conversations.
 */
export async function conversationErrorBoundaryHandler(error: BotError) {
  if (error.error instanceof EndConversationError) {
    return;
  } else {
    console.debug('[Conversation Error Boundary] Unrecognized error occured, throwing further...');
    throw error;
  }
}
