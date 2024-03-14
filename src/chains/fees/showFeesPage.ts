import feesMenu from '../../menu/fees';
import { BotContext } from '../../types';
import { RINCEL_COIN_TYPE } from '../sui.config';
import { getSuiScanCoinLink } from '../utils';
import { getUserFeePercentage } from './utils';

export async function showFeesPage(ctx: BotContext) {
  const findingMessage = await ctx.reply('<b>Looking at your assets...</b>', {
    parse_mode: 'HTML',
  });

  const feePercentage = await getUserFeePercentage(ctx);

  let infoString =
    `📈 <b>The more <a href="${getSuiScanCoinLink(RINCEL_COIN_TYPE)}">RINCEL</a></b> you have, ` +
    `<b>the lower fees</b> 📉\n\n`;
  infoString += `Your <b>fee level</b> now &#8213; <code>${feePercentage}</code>%\n\n`;
  infoString += '💳 <b>Fee Levels</b> 💳\n';
  infoString +=
    '<b>&lt;</b> <code>10,000</code> <b>RINCEL</b> &#8213; <code>1</code>%\n';
  infoString +=
    '<b>&lt;</b> <code>1,000,000</code> <b>RINCEL</b> &#8213; <code>0.75</code>%\n';
  infoString +=
    '<b>&#8805;</b> <code>1,000,000</code> <b>RINCEL</b> &#8213; <code>0.5</code>%\n';

  await ctx.api.editMessageText(
    findingMessage.chat.id,
    findingMessage.message_id,
    infoString,
    { reply_markup: feesMenu, parse_mode: 'HTML' },
  );
}
