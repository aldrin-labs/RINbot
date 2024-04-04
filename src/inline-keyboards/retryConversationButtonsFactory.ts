import { InlineKeyboard } from 'grammy';
import { ConversationId } from '../chains/conversations.config';
import { SurfdogConversationId } from '../chains/launchpad/surfdog/conversations/conversations.config';
import goHome from './goHome';
import surfdogHomeKeyboard from './surfdog/surfdogHome';

export type RetriableConversationId = ConversationId | SurfdogConversationId;

export type RetryAndGoHomeButtonsData = Record<RetriableConversationId, InlineKeyboard>;

export const retryAndGoHomeButtonsData = retryConversationButtonsFactory();

function retryConversationButtonsFactory(): RetryAndGoHomeButtonsData {
  const conversationIds = [...Object.values(ConversationId), ...Object.values(SurfdogConversationId)];

  return conversationIds.reduce((buttonsMap: RetryAndGoHomeButtonsData, conversationId: RetriableConversationId) => {
    let homeKeyboard: InlineKeyboard = goHome;

    if (Object.values(SurfdogConversationId).includes(conversationId as SurfdogConversationId)) {
      homeKeyboard = surfdogHomeKeyboard;
    }

    const retryAndGoHomeButton = new InlineKeyboard(homeKeyboard.clone().inline_keyboard).text(
      'Retry',
      `retry-${conversationId}`,
    );

    buttonsMap[conversationId] = retryAndGoHomeButton;
    return buttonsMap;
  }, {} as RetryAndGoHomeButtonsData);
}
