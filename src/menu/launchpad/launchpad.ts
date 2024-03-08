import { Menu } from '@grammyjs/menu';
import { showSurfdogPage } from '../../chains/launchpad/surfdog/show-pages/showSurfdogPage';
import { BotContext } from '../../types';
import surfdogMenu from './surfdog/main';

const launchpadMenu = new Menu<BotContext>('launchpad')
  .text('$SURFDOG', async (ctx) => {
    await showSurfdogPage(ctx);
  })
  .row()
  .back('Home');

launchpadMenu.register(surfdogMenu);

export default launchpadMenu;
