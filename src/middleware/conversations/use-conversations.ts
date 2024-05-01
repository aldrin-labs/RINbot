import { createConversation } from '@grammyjs/conversations';
import { Composer } from 'grammy';
import { BotContext } from '../../types';
import { conversations } from './config';

export function useConversations(protectedComposer: Composer<BotContext>) {
  conversations.forEach(({ id, method }) => {
    protectedComposer.use(createConversation(method, { id }));
  });
}
