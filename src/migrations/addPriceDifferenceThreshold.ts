import { DEFAULT_PRICE_DIFFERENCE_THRESHOLD_PERCENTAGE } from '../chains/trading/config';
import { SessionData } from '../types';

export function addPriceDifferenceThreshold(old: SessionData) {
  return {
    ...old,
    settings: {
      ...old.settings,
      priceDifferenceThreshold: DEFAULT_PRICE_DIFFERENCE_THRESHOLD_PERCENTAGE,
    },
  };
}
