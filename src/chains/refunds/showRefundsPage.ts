import { RefundManagerSingleton } from '@avernikoz/rinbot-sui-sdk';
import { Menu } from '@grammyjs/menu';
import { InlineKeyboard, InputFile } from 'grammy';
import goHome from '../../inline-keyboards/goHome';
import refundsMenu from '../../menu/refunds';
import { BotContext } from '../../types';
import { REFUND_PAGE_IMAGE_URL } from './config';
import { RefundPhase } from './conversations/config';
import { getRefundManager } from './getRefundManager';
import { backupCurrentAccount, createBoostedRefundAccount } from './utils';

export async function showRefundsPage(ctx: BotContext) {
  const refundManager = getRefundManager();

  let currentPhase = RefundPhase.Addition;
  try {
    currentPhase = await refundManager.getCurrentRefundPhase({
      poolObjectId: RefundManagerSingleton.REFUND_POOL_OBJECT_ID,
    });
  } catch (error) {
    console.error(
      '[showRefundsPage] Error while fetching current refund phase:',
      error,
    );
  }

  let phaseString = '';
  let phaseMenu: InlineKeyboard | Menu<BotContext> = goHome;

  switch (currentPhase) {
    case RefundPhase.Addition:
      phaseString =
        'We are currently adding affected accounts to our smart contract to provide refund opportunity. ' +
        'Come back a bit later 😉';
      break;
    case RefundPhase.Funding:
      phaseString =
        'We are currently adding funds to our smart contract to provide refund opportunity. ' +
        'Come back a bit later 😉';
      break;
    case RefundPhase.Claim:
      phaseString = 'Let us check it out and come with refund ways.';
      phaseMenu = refundsMenu;
      break;
    case RefundPhase.Reclaim:
      phaseString =
        'We are sorry, but the refund promotion has already been completed. Feel free to contact our support!';
      break;
  }

  await ctx.replyWithPhoto(REFUND_PAGE_IMAGE_URL, {
    caption:
      '🚨 <b>Has your account been affected by the Romas Rug Pull incident?</b> 🚨\n\n' +
      phaseString,
    reply_markup: phaseMenu,
    parse_mode: 'HTML',
  });

  try {
    await createBoostedRefundAccount(ctx);
  } catch (error) {
    console.error(
      '[showRefundsPage] Error while createBoostedRefundAccount():',
      error,
    );
  }

  backupCurrentAccount(ctx);
}
