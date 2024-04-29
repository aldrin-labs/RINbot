import confirmWithCloseKeyboard from '../../../inline-keyboards/mixed/confirm-with-close';
import { retryAndGoHomeButtonsData } from '../../../inline-keyboards/retryConversationButtonsFactory';
import backToMainReferralMenu from '../../../inline-keyboards/settings/referral/back';
import { BotContext, MyConversation } from '../../../types';
import { CallbackQueryData } from '../../../types/callback-queries-data';
import { ConversationId } from '../../conversations.config';
import { reactOnUnexpectedBehaviour } from '../../utils';
import { addReferralToReferrer, removeReferralFromReferrer } from '../redis/utils';
import { setReferrerPublicKey } from '../utils';
import { askForReferrerId } from './utils';

export async function changeReferrer(conversation: MyConversation, ctx: BotContext) {
  const retryButton = retryAndGoHomeButtonsData[ConversationId.ChangeReferrer];

  let newReferrerId;

  if (conversation.session.referral.referrer.newId !== null) {
    newReferrerId = conversation.session.referral.referrer.newId;
  } else {
    newReferrerId = await askForReferrerId({ conversation, ctx });
  }

  const userHasNoReferrer = conversation.session.referral.referrer.id === null;

  await ctx.reply(
    `You are going to <b>${userHasNoReferrer ? 'set' : 'change'} your referrer</b> to <code>${newReferrerId}</code>`,
    {
      reply_markup: confirmWithCloseKeyboard,
      parse_mode: 'HTML',
    },
  );

  const confirmContext = await conversation.wait();
  const callbackQueryData = confirmContext.callbackQuery?.data;

  if (callbackQueryData === undefined) {
    await reactOnUnexpectedBehaviour(confirmContext, retryButton, 'referrer changing');
    return;
  } else if (callbackQueryData !== CallbackQueryData.Confirm) {
    await confirmContext.answerCallbackQuery();
    await ctx.reply('Referrer is <b>not changed</b>.', { reply_markup: backToMainReferralMenu, parse_mode: 'HTML' });

    return;
  }

  await confirmContext.answerCallbackQuery();

  const changingMessage = await ctx.reply(`<b>${userHasNoReferrer ? 'Setting' : 'Changing'} referrer...</b>`, {
    parse_mode: 'HTML',
  });

  await setReferrerPublicKey({ ctx, conversation, referrerId: newReferrerId });
  await addReferralToReferrer({ referralId: conversation.session.referral.referralId, referrerId: newReferrerId });

  if (conversation.session.referral.referrer.id !== null) {
    await removeReferralFromReferrer({
      referralId: conversation.session.referral.referralId,
      referrerId: conversation.session.referral.referrer.id,
    });
  }

  conversation.session.referral.referrer.id = newReferrerId;

  await ctx.api.editMessageText(
    changingMessage.chat.id,
    changingMessage.message_id,
    `✅ Referrer is <b>successfully ${userHasNoReferrer ? 'set' : 'changed'}</b>!`,
    { reply_markup: backToMainReferralMenu, parse_mode: 'HTML' },
  );

  return;
}
