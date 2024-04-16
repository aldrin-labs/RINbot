import { InlineKeyboard } from 'grammy';
import { priceDifferenceThresholdPercentages } from '../../../chains/settings/price-difference-threshold/percentages';
import { CallbackQueryData } from '../../../types/callback-queries-data';

const priceDifferenceThresholdKeyboard = new InlineKeyboard();

priceDifferenceThresholdPercentages.forEach((percentage: number, index: number) => {
  priceDifferenceThresholdKeyboard.text(`${percentage}%`, `price-difference-threshold-${percentage}`);

  if (index % 2 !== 0) {
    priceDifferenceThresholdKeyboard.row();
  }
});

priceDifferenceThresholdKeyboard.text('Home', CallbackQueryData.Home);

export default priceDifferenceThresholdKeyboard;
