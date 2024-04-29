import shareMyReferralLinkMenu from '../../../menu/referral/share-link';
import { BotContext } from '../../../types';
import { getReferralLink, getReferralQrCode } from '../utils';

export async function showReferralQrCodePage(ctx: BotContext) {
  const loadingMessage = await ctx.reply('<b>Loading...</b>', { parse_mode: 'HTML' });
  const referralLink = getReferralLink(ctx.session.referral.referralId);
  const qrCode = await getReferralQrCode(referralLink);

  await ctx.api.deleteMessage(loadingMessage.chat.id, loadingMessage.message_id);

  await ctx.replyWithPhoto(qrCode, {
    caption: `✉ Your <b>referral QR-code</b>\n\nJust show it to your friend and enjoy 😎`,
    reply_markup: shareMyReferralLinkMenu,
    parse_mode: 'HTML',
  });
}
