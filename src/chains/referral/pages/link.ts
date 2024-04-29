import shareMyReferralLinkMenu from '../../../menu/referral/share-link';
import { BotContext } from '../../../types';
import { getReferralLink } from '../utils';

export async function showReferralLinkPage(ctx: BotContext) {
  const referralLink = getReferralLink(ctx.session.referral.referralId);

  await ctx.reply(
    `✉ Your <b>referral link</b>:\n<code>${referralLink}</code>\n\nJust send it to your friend and enjoy 😎`,
    { reply_markup: shareMyReferralLinkMenu, parse_mode: 'HTML' },
  );
}
