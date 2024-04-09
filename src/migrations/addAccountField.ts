import { SessionData } from '../types';

export function addAccountField(old: SessionData) {
  return { ...old, account: null };
}
