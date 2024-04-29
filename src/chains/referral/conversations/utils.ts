import { EndConversationError } from '../../../errors/end-conversation.error';
import closeConversation from '../../../inline-keyboards/closeConversation';
import { retryAndGoHomeButtonsData } from '../../../inline-keyboards/retryConversationButtonsFactory';
import { BotContext, MyConversation } from '../../../types';
import { CallbackQueryData } from '../../../types/callback-queries-data';
import { ConversationId } from '../../conversations.config';
import { reactOnUnexpectedBehaviour } from '../../utils';
import { getExistingReferralIds } from '../redis/utils';

export async function askForReferrerId({
  conversation,
  ctx,
}: {
  conversation: MyConversation;
  ctx: BotContext;
}): Promise<string> {
  const retryButton = retryAndGoHomeButtonsData[ConversationId.ChangeReferrer];

  await ctx.reply('Please, enter your <b>new referrer id</b>.', {
    reply_markup: closeConversation,
    parse_mode: 'HTML',
  });

  const newReferrerIdContext = await conversation.wait();
  const callbackQueryData = newReferrerIdContext.callbackQuery?.data;
  const newReferrerId = newReferrerIdContext.msg?.text?.trim();

  if (callbackQueryData === CallbackQueryData.Cancel) {
    await conversation.skip();
    throw new EndConversationError();
  } else if (callbackQueryData !== undefined || newReferrerId === undefined) {
    await reactOnUnexpectedBehaviour(newReferrerIdContext, retryButton, 'referrer changing');
    throw new EndConversationError();
  }

  if (newReferrerId === ctx.session.referral.referrer.id) {
    await ctx.reply(
      "The <b>referrer id</b> you've entered is your <b>current referrer id</b>. Please, enter a new one.",
      {
        reply_markup: closeConversation,
        parse_mode: 'HTML',
      },
    );

    await conversation.skip({ drop: true });
  }

  const existingReferrerIds = await conversation.external(() => getExistingReferralIds());

  if (!existingReferrerIds.includes(newReferrerId)) {
    await ctx.reply(
      'Cannot find the user with this <b>referral id</b>. Please, enter a valid one or contact support.',
      {
        reply_markup: closeConversation,
        parse_mode: 'HTML',
      },
    );

    await conversation.skip({ drop: true });
  }

  if (newReferrerId === ctx.session.referral.referralId) {
    await ctx.reply(
      "The <b>referrer id</b> you've entered is your <b>referral id</b>. Please, enter the valid <b>referrer id</b>.",
      {
        reply_markup: closeConversation,
        parse_mode: 'HTML',
      },
    );

    await conversation.skip({ drop: true });
  }

  return newReferrerId;
}
