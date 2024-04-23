import { InlineKeyboard } from 'grammy';
import { OnboardingCallbackQueryData } from '../../../chains/help/onboarding/callback-query-data';

const noThanksKeyboard = new InlineKeyboard().text('No, thanks', OnboardingCallbackQueryData.Finish);

export default noThanksKeyboard;
