import slippageConfigurationKeyboard from '../../inline-keyboards/slippage/slippage-configuration';
import { BotContext } from '../../types';

export async function showSlippageConfiguration(ctx: BotContext) {
  await ctx.reply(
    `Current slippage: <b>${ctx.session.settings.slippagePercentage}%</b>\n\n` +
      `Click on the corresponding percentage below to change slippage.`,
    { reply_markup: slippageConfigurationKeyboard, parse_mode: 'HTML' },
  );
}
