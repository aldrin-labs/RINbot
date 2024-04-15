import goHome from '../../inline-keyboards/goHome';
import { BotContext } from '../../types';
import { getCoinWhitelist, getSuiScanCoinLink } from '../utils';

export async function showCoinWhitelist(ctx: BotContext) {
  const coinWhitelist = await getCoinWhitelist();

  if (coinWhitelist === null) {
    await ctx.reply('Failed to fetch coin whitelist. Please, try again later or contact support.', {
      reply_markup: goHome,
    });

    return;
  }

  let whitelistString = '🪙   <b>Coin Whitelist</b>   🪙\n\n';
  coinWhitelist.forEach(
    (coinData) => (whitelistString += `<a href="${getSuiScanCoinLink(coinData.type)}">${coinData.symbol}</a>\n`),
  );

  await ctx.reply(whitelistString, {
    reply_markup: goHome,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
  });
}
