import { InlineKeyboard } from 'grammy';
import { OnboardingCallbackQueryData } from '../../../chains/help/onboarding/callback-query-data';

const letsGoKeyboard = new InlineKeyboard().text("Let's go!", OnboardingCallbackQueryData.Start);

export default letsGoKeyboard;
