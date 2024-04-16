import thresholdKeyboard from '../../../inline-keyboards/settings/price-difference-threshold/configuration';
import { BotContext } from '../../../types';

export async function showPriceDifferenceThresholdPage(ctx: BotContext) {
  const { priceDifferenceThreshold } = ctx.session.settings;

  await ctx.reply(
    `⚡  <b>Price Difference Threshold</b>: <code>${priceDifferenceThreshold}%</code>\n\n` +
      '✏  Select your acceptable difference between the fair price and the swap price. If the swap price ' +
      "exceeds this limit, you'll receive a warning during the swap.\n\nFair price — represents the " +
      'estimated market value of the asset at a given time, utilizing off-chain price sources such as ' +
      'CoinMarketCap or CoinGecko.\n\nSwap Price — represents the current price offered for the asset ' +
      'in the swap transaction.',
    {
      reply_markup: thresholdKeyboard,
      parse_mode: 'HTML',
    },
  );
}
