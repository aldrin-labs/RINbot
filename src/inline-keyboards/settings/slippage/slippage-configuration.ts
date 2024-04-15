import { InlineKeyboard } from 'grammy';
import { slippagePercentages } from '../../../chains/settings/slippage/percentages';

const slippageConfigurationKeyboard = new InlineKeyboard();

slippagePercentages.forEach((percentage: number, index: number) => {
  slippageConfigurationKeyboard.text(`${percentage}%`, `slippage-${percentage}`);

  if (index % 2 !== 0) {
    slippageConfigurationKeyboard.row();
  }
});

slippageConfigurationKeyboard.text('Home', 'go-home');

export default slippageConfigurationKeyboard;
