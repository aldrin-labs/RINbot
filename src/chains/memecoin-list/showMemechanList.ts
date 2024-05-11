import goHome from '../../inline-keyboards/goHome';
import { BotContext } from '../../types';
import { getMemechanLiveCoinsList, getSuiScanCoinLink } from '../utils';

export async function showMemechanLiveCoinsList(ctx: BotContext) {
  const coinWhitelist = await getMemechanLiveCoinsList();

  if (coinWhitelist === null) {
    await ctx.reply('Failed to fetch memechan live coins list. Please, try again later or contact support.', {
      reply_markup: goHome,
    });

    return;
  }

  let whitelistString = '🪙   <b>Memechan Live Coins</b>   🪙\n\n';
  coinWhitelist.forEach(
    (coinData) => (whitelistString += `<a href="${getSuiScanCoinLink(coinData.type)}">${coinData.symbol}</a>\n`),
  );

  await ctx.reply(whitelistString, {
    reply_markup: goHome,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
  });
}
