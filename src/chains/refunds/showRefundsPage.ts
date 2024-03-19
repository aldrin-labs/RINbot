import refundsMenu from '../../menu/refunds';
import { BotContext } from '../../types';

export async function showRefundsPage(ctx: BotContext) {
  await ctx.reply(
    '🚨 <b>Has your account been affected by the Romas Rug Pull incident?</b> 🚨\n\n' +
      'Let us check it out and come with refund ways.',
    { reply_markup: refundsMenu, parse_mode: 'HTML' },
  );
}
