import { RefundManagerSingleton } from '@avernikoz/rinbot-sui-sdk';
import BigNumber from 'bignumber.js';
import closeConversation from '../../../inline-keyboards/closeConversation';
import confirmWithCloseKeyboard from '../../../inline-keyboards/mixed/confirm-with-close';
import refundOptionsKeyboard from '../../../inline-keyboards/refunds/refund-options';
import { retryAndGoHomeButtonsData } from '../../../inline-keyboards/retryConversationButtonsFactory';
import { BotContext, MyConversation } from '../../../types';
import { CallbackQueryData } from '../../../types/callback-queries-data';
import { ConversationId } from '../../conversations.config';
import { reactOnUnexpectedBehaviour } from '../../utils';
import { getRefundManager } from '../getRefundManager';
import { claimBaseRefund, claimBoostedRefund } from './utils';

export async function checkCurrentWallet(
  conversation: MyConversation,
  ctx: BotContext,
) {
  const refundManager = getRefundManager();
  const retryButton =
    retryAndGoHomeButtonsData[ConversationId.CheckCurrentWalletForRefund];
  const closeButtons = closeConversation.inline_keyboard[0];
  const optionsWithCloseKeyboard = refundOptionsKeyboard
    .clone()
    .row()
    .add(...closeButtons);

  const checkingMessage = await ctx.reply(
    '<b>Checking your current account address. This may take some time...</b>',
    {
      parse_mode: 'HTML',
    },
  );

  // Check current wallet
  let normalRefund;
  let boostedRefund;
  try {
    const claimAmounts = await conversation.external(async () => {
      return await refundManager.getClaimAmount({
        poolObjectId: RefundManagerSingleton.REFUND_POOL_OBJECT_ID,
        affectedAddress: conversation.session.publicKey,
      });
    });

    normalRefund = claimAmounts.normalRefund;
    boostedRefund = claimAmounts.boostedRefund;
  } catch (error) {
    await ctx.reply(
      '🛑 Oops! Something went wrong while retrieving the available refund amount. Please try again.',
      {
        reply_markup: retryButton,
      },
    );

    return;
  }

  if (new BigNumber(normalRefund.mist).isEqualTo(0)) {
    await ctx.api.editMessageText(
      checkingMessage.chat.id,
      checkingMessage.message_id,
      '✅ Your account is either not affected or you have already claimed the refund. If you have any questions ' +
        'feel free to reach out to us.',
      {
        reply_markup: retryButton,
        parse_mode: 'HTML',
      },
    );

    return;
  }

  const baseRefundAmount = normalRefund.sui;
  const boostedRefundAmount = boostedRefund.sui;

  await ctx.api.editMessageText(
    checkingMessage.chat.id,
    checkingMessage.message_id,
    `✅ We have identified <code>${baseRefundAmount}</code> <b>SUI</b> available for refunding to your account.`,
    {
      parse_mode: 'HTML',
    },
  );

  await ctx.reply(
    '📝 Here are <b>two options</b> for the refund:\n\n' +
      `💵 1. <b>Base Refund</b>: Receive <i><b>100%</b></i> of your lost funds — <code>${baseRefundAmount}` +
      '</code> <b>SUI</b>.\n\n' +
      `💸 2. <b>Boosted Refund</b>: Enjoy <i><b>150%</b></i> of your lost funds — <code>${boostedRefundAmount}` +
      '</code> <b>SUI</b>.\nWhile all features ' +
      'of the RINbot remain accessible, ' +
      `you'll be able to withdraw only profits. The initial refund amount of <code>${boostedRefundAmount}</code> <b>SUI</b> will be non-withdrawable.`,
    {
      reply_markup: optionsWithCloseKeyboard,
      parse_mode: 'HTML',
    },
  );
  let userConfirmedChoise = false;
  do {
    const choiseContext = await conversation.wait();
    const choiseCallbackQueryData = choiseContext.callbackQuery?.data;

    if (choiseCallbackQueryData === CallbackQueryData.Cancel) {
      await conversation.skip();
    } else if (choiseCallbackQueryData === CallbackQueryData.BaseRefund) {
      await choiseContext.answerCallbackQuery();

      await ctx.reply(
        `Please, confirm your choice — <b>base refund</b> (<code>${baseRefundAmount}</code> <b>SUI</b>).`,
        {
          reply_markup: confirmWithCloseKeyboard,
          parse_mode: 'HTML',
        },
      );

      const confirmContext = await conversation.wait();
      const confirmCallbackQueryData = confirmContext.callbackQuery?.data;

      if (confirmCallbackQueryData === CallbackQueryData.Cancel) {
        await confirmContext.answerCallbackQuery();

        await ctx.reply('Please, select your preferred option.', {
          reply_markup: optionsWithCloseKeyboard,
        });

        continue;
      } else if (confirmCallbackQueryData === CallbackQueryData.Confirm) {
        await confirmContext.answerCallbackQuery();
        userConfirmedChoise = true;
        return await claimBaseRefund({ ctx, conversation, retryButton });
      } else {
        await reactOnUnexpectedBehaviour(
          confirmContext,
          retryButton,
          'current wallet check',
        );
        return;
      }
    } else if (choiseCallbackQueryData === CallbackQueryData.BoostedRefund) {
      await choiseContext.answerCallbackQuery();

      await ctx.reply(
        `Please, confirm your choice — <b>boosted refund</b> (<code>${boostedRefundAmount}</code> <b>SUI</b>).`,
        {
          reply_markup: confirmWithCloseKeyboard,
          parse_mode: 'HTML',
        },
      );

      const confirmContext = await conversation.wait();
      const confirmCallbackQueryData = confirmContext.callbackQuery?.data;

      if (confirmCallbackQueryData === CallbackQueryData.Cancel) {
        await confirmContext.answerCallbackQuery();

        await ctx.reply('Please, select your preferred option.', {
          reply_markup: optionsWithCloseKeyboard,
        });

        continue;
      } else if (confirmCallbackQueryData === CallbackQueryData.Confirm) {
        await confirmContext.answerCallbackQuery();
        userConfirmedChoise = true;
        return await claimBoostedRefund({
          ctx,
          conversation,
          retryButton,
          boostedRefundAmount,
        });
      } else {
        await reactOnUnexpectedBehaviour(
          ctx,
          retryButton,
          'current wallet check',
        );
        return;
      }
    } else {
      await reactOnUnexpectedBehaviour(
        choiseContext,
        retryButton,
        'current wallet check',
      );
      return;
    }
  } while (!userConfirmedChoise);
}
