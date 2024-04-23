import goHome from '../../../inline-keyboards/goHome';
import { a, b } from '../../../text-formatting/formats';
import { BotContext } from '../../../types';
import { ALDRIN_LABS_X_URL, RINBOT_CHAT_URL } from '../../sui.config';

export async function showContactUsPage(ctx: BotContext) {
  await ctx.reply(`${b(a('Telegram Chat', RINBOT_CHAT_URL))}\n${b(a('X (Twitter)', ALDRIN_LABS_X_URL))}`, {
    reply_markup: goHome,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
  });
}
