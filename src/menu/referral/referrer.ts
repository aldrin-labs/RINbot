import { Menu } from '@grammyjs/menu';
import { showMainReferralPage } from '../../chains/referral/pages/main';
import { BotContext } from '../../types';
import { ConversationId } from '../../chains/conversations.config';

const referrerMenu = new Menu<BotContext>('referrer')
  .text(
    (ctx) => {
      const userHasNoReferrer = ctx.session.referral.referrer.id === null;
      return userHasNoReferrer ? 'Set Referrer' : 'Change Referrer';
    },
    async (ctx) => {
      ctx.session.referral.referrer.newId = null;
      await ctx.conversation.enter(ConversationId.ChangeReferrer);
    },
  )
  .row()
  .text('Back', async (ctx) => {
    await showMainReferralPage(ctx);
  });

export default referrerMenu;
