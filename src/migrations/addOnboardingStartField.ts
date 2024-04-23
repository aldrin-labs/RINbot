import { SessionData } from '../types';

export function addOnboardingStartField(old: SessionData) {
  return {
    ...old,
    onboarding: { startWithOnboarding: false },
  };
}
