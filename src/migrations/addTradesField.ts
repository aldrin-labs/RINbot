import { SessionData } from '../types';

export function addTradesField(old: SessionData) {
  return {
    ...old,
    trades: {},
  };
}
