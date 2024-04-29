import { Menu } from '@grammyjs/menu';
import { BotContext } from '../../types';
import { showMainReferralPage } from '../../chains/referral/pages/main';

const shareMyReferralLinkMenu = new Menu<BotContext>('share-referral-link').text('Back', async (ctx) => {
  await showMainReferralPage(ctx);
});

export default shareMyReferralLinkMenu;
