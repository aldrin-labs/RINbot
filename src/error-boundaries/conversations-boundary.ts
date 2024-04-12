import { BotError } from 'grammy';
import { EndConversationError } from '../errors/end-conversation.error';

export async function conversationErrorBoundaryHandler(error: BotError) {
  if (error.error instanceof EndConversationError) {
    return;
  } else {
    console.debug('[Conversation Error Boundary] Error occured, throwing further...');
    throw error;
  }
}
