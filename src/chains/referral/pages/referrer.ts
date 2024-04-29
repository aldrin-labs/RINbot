import referrerMenu from '../../../menu/referral/referrer';
import { BotContext } from '../../../types';

export async function showReferrerPage(ctx: BotContext) {
  const referrerId = ctx.session.referral.referrer.id;

  let text = '✏ <b><i>Referrer</i></b> is a person whose <b>referral link</b> or <b>QR-code</b> you followed.\n\n';

  if (referrerId === null) {
    text += '✖ You have no <b><i>referrer</i></b>.';
  } else {
    text += `Your referrer id: <code>${referrerId}</code>`;
  }

  await ctx.reply(text, { reply_markup: referrerMenu, parse_mode: 'HTML' });
}
