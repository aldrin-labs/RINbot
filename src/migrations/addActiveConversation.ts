import { SessionData } from '../types';

export function addActiveConversation(old: SessionData) {
  return {
    ...old,
    activeConversation: null,
  };
}
