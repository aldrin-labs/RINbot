import onboardingStartMenu from '../../../../menu/help/onboarding/start';
import { ib } from '../../../../text-formatting/formats';
import { BotContext } from '../../../../types';

const text =
  `Nice to meet you here 😎\n\nYou can choose a section you are interested in with the help of a ` +
  `${ib('Sections')} button, or just go through all the sections by pressing a ${ib("Let's go!")} button.`;

export const showStartOnboardingPage = async function (ctx: BotContext) {
  await ctx.reply(text, { reply_markup: onboardingStartMenu, parse_mode: `HTML` });
};
