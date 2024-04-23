import { b, a } from '../../../../text-formatting/formats';
import { RINBOT_CHAT_URL, ALDRIN_LABS_X_URL } from '../../../sui.config';
import { OnboardingCallbackQueryData } from '../callback-query-data';
import { OnboardingArticle, OnboardingNodeType } from '../types';

export const conclusionArticle: OnboardingArticle = {
  type: OnboardingNodeType.Article,
  name: 'Conclusion',
  callbackQueryData: OnboardingCallbackQueryData.Conclusion,
  text:
    `So-o, that was the last step of our onboarding. We hope you enjoyed this journey 😎\n\n` +
    `Feel free to join our community: ${b(a('Telegram Chat', RINBOT_CHAT_URL))}, ` +
    `${b(a('X (Twitter)', ALDRIN_LABS_X_URL))}. There you can ask any questions you have 😉\n\n` +
    `Have a nice trades!`,
  nextItemCallbackQueryData: OnboardingCallbackQueryData.Nothing,
};
