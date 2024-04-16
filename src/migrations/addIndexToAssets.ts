import { SessionData } from '../types';

export function addIndexToAssets(old: SessionData) {
  return {
    ...old,
    assets: {
      currentIndex: 0,
      data: old.assets,
    },
  };
}
