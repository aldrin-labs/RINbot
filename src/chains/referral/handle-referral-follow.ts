import goHome from '../../inline-keyboards/goHome';
import { BotContext } from '../../types';
import { ConversationId } from '../conversations.config';
import { addReferralToReferrer } from './redis/utils';
import { setReferrerPublicKey } from './utils';

export async function handleReferralFollow({
  ctx,
  referrerId,
}: {
  ctx: BotContext;
  referrerId: string;
}): Promise<{ referrerIsChanging: boolean }> {
  const currentReferrerId = ctx.session.referral.referrer.id;

  // Just silent exit, when user tries to change his referrer to his current referrer
  if (referrerId === currentReferrerId) {
    return { referrerIsChanging: false };
  }

  if (currentReferrerId === null) {
    if (referrerId === ctx.session.referral.referralId) {
      await ctx.reply('❌ You cannot be a <b>referrer</b> of yourself.', { reply_markup: goHome, parse_mode: 'HTML' });

      return { referrerIsChanging: false };
    }

    ctx.session.referral.referrer.id = referrerId;

    setReferrerPublicKey({ ctx, referrerId });
    addReferralToReferrer({ referralId: ctx.session.referral.referralId, referrerId });
  } else {
    ctx.session.referral.referrer.newId = referrerId;

    await ctx.conversation.enter(ConversationId.ChangeReferrer);

    return { referrerIsChanging: true };
  }

  return { referrerIsChanging: false };
}
