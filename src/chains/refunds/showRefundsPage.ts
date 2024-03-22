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
        'Phase 1: Address Addition\n' +
        'We are currently compiling a list of affected accounts to facilitate the refund process. ' +
        'Please check back later for updates 😉';
      break;
    case RefundPhase.Funding:
      phaseString =
        'Phase 2: Funding\n' +
        'We are currently gathering funds into the smart contract to facilitate the refund process. ' +
        'Please check back later for updates 😉';
      break;
    case RefundPhase.Claim:
      phaseString = 
        'Phase 3: Claim\n' +
        "We are now processing refund requests. If you've been affected, please proceed with your claim. " +
        'Use the menu provided for refund options.';
      phaseMenu = refundsMenu;
      break;
    case RefundPhase.Reclaim:
      phaseString =
      'Phase 4: Reclaim\n' +
        "We regret to inform you that the refund process has concluded." + 
        "If you have any further inquiries, please don't hesitate to contact our support team.!";
      break;
  }

  await ctx.replyWithPhoto(REFUND_PAGE_IMAGE_URL, {
    caption:
      '🚨 <b>Affected by recent $PIKKA coin pre-sale?</b> 🚨\n\n' +
      "If you've been affected, we're here to assist you through the refund process." +
      "Please check the current phase below for updates on how to proceed.\n\n" +
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

  // Regardless if it's failed or not, we'll check the existance of backup account during the refund process
  // In case if do not exists, we'll simply fail the operation and ask to try again.
  // So it's safe to backup without any additional check
  backupCurrentAccount(ctx);
}
