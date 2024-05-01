import { MiddlewareFn } from 'grammy';
import goHome from '../inline-keyboards/goHome';
import { BotContext } from '../types';
import { conversationsMap } from './conversations/config';

/**
 * Middleware checks whether a user has any active conversations. If that's the case, it gets a last
 * active conversation stored in a session and compares its version with the most actual version of this conversation.
 * If the conversation, that the user is in, is outdated, the middleware notifies about this the user and exits the
 * conversation.
 */
export const checkActiveConversationVersion: MiddlewareFn<BotContext> = async (ctx, next) => {
  const activeConversations = await ctx.conversation.active();
  const activeConvIds = Object.keys(activeConversations);
  const storedConversation = ctx.session.activeConversation;

  // If there is no active convs, we do not need to do anything.
  if (activeConvIds.length === 0) {
    await next();
    return;
  }

  // This case, when there are active conversations, but the stored active conversation is `null`, may occur, when
  // the user started the conversation(s) before the RINbot update with the active conversation storing to the session.
  if (storedConversation === null) {
    await ctx.reply(
      '👋 Hey! The RINsui_bot is just got updated. To avoid any issues, all the active interactions with the bot ' +
        'you had before this update are closed now.\n\n❤ Our apologize for any confusion that might happen.',
      { reply_markup: goHome },
    );
    await ctx.conversation.exit();

    await next();
    return;
  }

  const { id: storedConvId, version: storedConvVersion } = storedConversation;
  const storedConvInActiveConvs = activeConversations[storedConvId];
  const thereIsNoStoredConvInActiveConvs = storedConvInActiveConvs === undefined;

  // This case, when the active conversations do not contain the stored active conversation, should never happen due to
  // the `enterConversation` method using each time, when we need to enter any conversation.
  if (thereIsNoStoredConvInActiveConvs) {
    await ctx.reply(
      '👋 Hey! The RINsui_bot is just got updated. To avoid any issues, all the active interactions with the bot ' +
        'you had before this update are closed now.\n\n❤ Our apologize for any confusion that might happen.',
      { reply_markup: goHome },
    );
    await ctx.conversation.exit();

    await next();
    return;
  }

  const actualConvVersion = conversationsMap[storedConvId].version;
  const convIsOutdated = storedConvVersion < actualConvVersion;

  // If the stored conversation is outdated, notify the user about it and exit the conversation.
  if (convIsOutdated) {
    await ctx.reply(
      '👋 Hey! The RINsui_bot is just got updated. To avoid any issues, all the active interactions with the bot ' +
        'you had before this update are closed now.\n\n❤ Our apologize for any confusion that might happen.',
      { reply_markup: goHome },
    );
    await ctx.conversation.exit();

    await next();
    return;
  }

  await next();
};
