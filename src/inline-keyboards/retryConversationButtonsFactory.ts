import { InlineKeyboard } from 'grammy';
import { CommonConversationId } from '../chains/conversations.config';
import { SurfdogConversationId } from '../chains/launchpad/surfdog/conversations/conversations.config';
import { ConversationId } from '../types/conversations';
import goHome from './goHome';
import surfdogHomeKeyboard from './surfdog/surfdogHome';

export type RetryAndGoHomeButtonsData = Record<ConversationId, InlineKeyboard>;

export const retryAndGoHomeButtonsData = retryConversationButtonsFactory();

function retryConversationButtonsFactory(): RetryAndGoHomeButtonsData {
  const conversationIds = [...Object.values(CommonConversationId), ...Object.values(SurfdogConversationId)];

  return conversationIds.reduce((buttonsMap: RetryAndGoHomeButtonsData, conversationId: ConversationId) => {
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
