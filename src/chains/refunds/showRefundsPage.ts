import { InputFile } from 'grammy';
import refundsMenu from '../../menu/refunds';
import { BotContext } from '../../types';
import { REFUND_PAGE_IMAGE_PATH } from './config';

export async function showRefundsPage(ctx: BotContext) {
  await ctx.replyWithPhoto(new InputFile(REFUND_PAGE_IMAGE_PATH), {
    caption:
      '🚨 <b>Has your account been affected by the Romas Rug Pull incident?</b> 🚨\n\n' +
      'Let us check it out and come with refund ways.',
    reply_markup: refundsMenu,
    parse_mode: 'HTML',
  });
}
