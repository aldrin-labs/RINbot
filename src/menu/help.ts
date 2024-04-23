import { Menu } from '@grammyjs/menu';
import { showContactUsPage } from '../chains/help/contact-us/show-contact-us-page';
import { showStartOnboardingPage } from '../chains/help/onboarding/pages/start';
import { BotContext } from '../types';
import onboardingStartMenu from './help/onboarding/start';

const helpMenu = new Menu<BotContext>('help')
  .text('Contact Us', async (ctx) => {
    await showContactUsPage(ctx);
  })
  .text('Onboarding', async (ctx) => {
    await showStartOnboardingPage(ctx);
  })
  .row()
  .back('Home');

helpMenu.register(onboardingStartMenu);

export default helpMenu;
