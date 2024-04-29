import referralMenu from '../../../menu/referral/referral';
import { BotContext } from '../../../types';

export async function showMainReferralPage(ctx: BotContext) {
  const referralId = ctx.session.referral.referralId;

  await ctx.reply(
    '🚀 Wanna share your <b>referral link</b>, <b>QR-code</b>, or <b>change your referrer</b>? ' +
      `Then you are at the right place 😎\n\nYour <b>referral id</b>: <code>${referralId}</code>\n\n` +
      `<span class="tg-spoiler"><b>Hint</b>: <b>referral id</b> is your unique referral identificator, ` +
      `that you certainly can share with your friends, but for better experience use the ` +
      `<b><i>Share</i></b> button 😉</span>`,
    { reply_markup: referralMenu, parse_mode: 'HTML' },
  );
}
