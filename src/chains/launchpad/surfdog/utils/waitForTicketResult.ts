import { BotContext } from '../../../../types';
import { sleep } from '../../../utils';

export async function waitForTicketResult(ctx: BotContext) {
  await ctx.reply('<b>3...</b>', { parse_mode: 'HTML' });
  await sleep(250);

  await ctx.reply('<b>2...</b>', { parse_mode: 'HTML' });
  await sleep(250);

  await ctx.reply('<b>1...</b>', { parse_mode: 'HTML' });
  await sleep(250);
}
