import { InlineKeyboard } from 'grammy';
import { ConversationId } from '../chains/conversations.config';
import goHome from './goHome';

export type RetryAndGoHomeButtonsData = Record<ConversationId, InlineKeyboard>;

export const retryAndGoHomeButtonsData = retryConversationButtonsFactory();

function retryConversationButtonsFactory(): RetryAndGoHomeButtonsData {
  const conversationIds = Object.values(ConversationId);

  return conversationIds.reduce(
    (buttonsMap: RetryAndGoHomeButtonsData, conversationId: ConversationId) => {
      const retryAndGoHomeButton = new InlineKeyboard(
        goHome.clone().inline_keyboard,
      ).text('Retry', `retry-${conversationId}`);

      buttonsMap[conversationId] = retryAndGoHomeButton;
      return buttonsMap;
    },
    {} as RetryAndGoHomeButtonsData,
  );
}
