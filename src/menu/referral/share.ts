import { Menu } from '@grammyjs/menu';
import { showReferralLinkPage } from '../../chains/referral/pages/link';
import { BotContext } from '../../types';

export const shareMyReferralMenuId = 'share-referral';

const shareMyReferralMenu = new Menu<BotContext>(shareMyReferralMenuId)
  .text('QR-code', async (ctx) => {
    await ctx.reply('Soon...');
  })
  .text('Link', async (ctx) => {
    await showReferralLinkPage(ctx);
  })
  .row()
  .back('Back');

export default shareMyReferralMenu;
