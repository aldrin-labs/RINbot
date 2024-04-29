import shareMyReferralLinkMenu from '../../../menu/referral/share-link';
import { BotContext } from '../../../types';
import { getUserReferrals } from '../redis/utils';

export async function showMyReferralsPage(ctx: BotContext) {
  const loadingMessage = await ctx.reply('<b>Loading...</b>', { parse_mode: 'HTML' });

  const userReferrals = await getUserReferrals(ctx.session.referral.referralId);

  if (userReferrals.length === 0) {
    await ctx.api.editMessageText(loadingMessage.chat.id, loadingMessage.message_id, '✏ You have no referrals yet.', {
      reply_markup: shareMyReferralLinkMenu,
    });

    return;
  }

  let refString = '💰 <b>My Referrals</b> 💰';

  userReferrals.forEach((refId) => {
    refString += `\n\n<b>Referral id</b>: <code>${refId}</code>\n`;
    refString += `<b>Fees earned</b>: <i>coming soon</i>`;
  });

  await ctx.api.editMessageText(loadingMessage.chat.id, loadingMessage.message_id, refString, {
    reply_markup: shareMyReferralLinkMenu,
    parse_mode: 'HTML',
  });
}
