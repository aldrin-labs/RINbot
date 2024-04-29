import { Menu } from '@grammyjs/menu';
import { showMyReferralsPage } from '../../chains/referral/pages/my-referrals';
import { showReferrerPage } from '../../chains/referral/pages/referrer';
import { home } from '../../chains/sui.functions';
import { BotContext } from '../../types';
import referrerMenu from './referrer';
import shareMyReferralMenu, { shareMyReferralMenuId } from './share';
import shareMyReferralLinkMenu from './share-link';

const referralMenu = new Menu<BotContext>('referral')
  .submenu('Share', shareMyReferralMenuId)
  .row()
  .text('My Referrals', async (ctx) => {
    await showMyReferralsPage(ctx);
  })
  .text('Referrer', async (ctx) => {
    await showReferrerPage(ctx);
  })
  .row()
  .text('Home', async (ctx) => {
    await home(ctx);
  });

referralMenu.register([shareMyReferralMenu, shareMyReferralLinkMenu, referrerMenu]);

export default referralMenu;
