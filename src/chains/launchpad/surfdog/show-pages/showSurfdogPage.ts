import surfdogMenu from '../../../../menu/launchpad/surfdog/main';
import { BotContext } from '../../../../types';

export async function showSurfdogPage(ctx: BotContext) {
  const caption =
    '<b>Welcome to $SURFDOG launchpad!</b>\n\nSurfDog is the most transparent meme-coin project, ' +
    'existing only for supporting Sui and its ecosystem.\n\nSurf with the SurfDog to fuel the ongoing ' +
    'evolution of our vibrant ecosystem🏄\n\n#uSURF?';

  await ctx.replyWithPhoto('https://www.surfdog.xyz/metatag.jpg', {
    caption,
    parse_mode: 'HTML',
    reply_markup: surfdogMenu,
  });

  return;
}
