import { SessionData } from '../types';

export function addSwapConfirmationSetting(old: SessionData) {
  return {
    ...old,
    settings: {
      ...old.settings,
      swapWithConfirmation: true,
    },
  };
}
