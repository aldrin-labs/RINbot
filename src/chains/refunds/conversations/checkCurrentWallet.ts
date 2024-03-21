import { RefundManagerSingleton } from '@avernikoz/rinbot-sui-sdk';
import BigNumber from 'bignumber.js';
import closeConversation from '../../../inline-keyboards/closeConversation';
import confirmWithCloseKeyboard from '../../../inline-keyboards/mixed/confirm-with-close';
import refundOptionsKeyboard from '../../../inline-keyboards/refund-options';
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
    '<b>Checking this account, it may take some time....</b>',
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
    await ctx.reply('Something went wrong. Please, try again.', {
      reply_markup: retryButton,
    });

    return;
  }

  if (new BigNumber(normalRefund.mist).isEqualTo(0)) {
    await ctx.api.editMessageText(
      checkingMessage.chat.id,
      checkingMessage.message_id,
      '✅ Your account is not affected or you already have claimed the refund. If you do not agree, please ' +
        'contact the support service.',
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
    `✅ We have found <code>${baseRefundAmount}</code> <b>SUI</b> to refund for this account.`,
    {
      parse_mode: 'HTML',
    },
  );

  await ctx.reply(
    '✎ Here are <b>two options</b> for the refund:\n\n' +
      `💵 1. <b>Base Refund</b>: Receive <i><b>100%</b></i> of your lost funds — <code>${baseRefundAmount}` +
      '</code> <b>SUI</b>.\nYou can withdraw funds and export your private key as usual.\n\n' +
      `💸 2. <b>Boosted Refund</b>: Enjoy <i><b>150%</b></i> of your lost funds — <code>${boostedRefundAmount}` +
      "</code> <b>SUI</b>.\nWe'll create a new secure account for you and send the funds there. All the features " +
      'of the RINbot are opened, ' +
      `but you can withdraw only profit. <code>${boostedRefundAmount}</code> <b>SUI</b> are non-withdrawable. ` +
      'Also export private key feature will be disabled.',
    {
      reply_markup: optionsWithCloseKeyboard,
      parse_mode: 'HTML',
    },
  );

  let userConfirmedChoise = false;
  do {
    const choiseContext = await conversation.waitFor('callback_query:data');
    const choiseCallbackQueryData = choiseContext.callbackQuery.data;

    if (choiseCallbackQueryData === CallbackQueryData.Cancel) {
      await conversation.skip();
    } else if (choiseCallbackQueryData === CallbackQueryData.BaseRefund) {
      await choiseContext.answerCallbackQuery();

      await ctx.reply(
        `Please, confirm your choise — <b>base refund</b> (<code>${baseRefundAmount}</code> <b>SUI</b>).`,
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
        `Please, confirm your choise — <b>boosted refund</b> (<code>${boostedRefundAmount}</code> <b>SUI</b>).`,
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
