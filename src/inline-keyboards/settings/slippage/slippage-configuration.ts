import { InlineKeyboard } from 'grammy';
import { slippagePercentages } from '../../../chains/settings/slippage/percentages';
import { shouldBeRowAfterButton } from '../../utils';

const slippageConfigurationKeyboard = new InlineKeyboard();

slippagePercentages.forEach((percentage: number, index: number) => {
  slippageConfigurationKeyboard.text(`${percentage}%`, `slippage-${percentage}`);

  if (shouldBeRowAfterButton(index, 2)) {
    slippageConfigurationKeyboard.row();
  }
});

slippageConfigurationKeyboard.text('Home', 'go-home');

export default slippageConfigurationKeyboard;
