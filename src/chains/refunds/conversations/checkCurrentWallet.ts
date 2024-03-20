import { SUI_DENOMINATOR } from '@avernikoz/rinbot-sui-sdk';
import BigNumber from 'bignumber.js';
import closeConversation from '../../../inline-keyboards/closeConversation';
import confirmWithCloseKeyboard from '../../../inline-keyboards/confirm-with-close';
import refundOptionsKeyboard from '../../../inline-keyboards/refund-options';
import { retryAndGoHomeButtonsData } from '../../../inline-keyboards/retryConversationButtonsFactory';
import { BotContext, MyConversation } from '../../../types';
import { CallbackQueryData } from '../../../types/callback-queries-data';
import { ConversationId } from '../../conversations.config';
import { reactOnUnexpectedBehaviour } from '../../utils';
import { getAffectedAddressData } from '../utils';
import { claimBaseRefund, claimBoostedRefund } from './utils';

export async function checkCurrentWallet(
  conversation: MyConversation,
  ctx: BotContext,
) {
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
  const affectedAddressData = await conversation.external(() =>
    getAffectedAddressData(conversation.session.publicKey),
  );

  if (affectedAddressData === undefined) {
    await ctx.api.editMessageText(
      checkingMessage.chat.id,
      checkingMessage.message_id,
      'We have <b>not found any traces of a scam</b> for this account. If you do not agree, please ' +
        'contact the support service.',
      {
        reply_markup: retryButton,
        parse_mode: 'HTML',
      },
    );

    return;
  }

  // TODO: Add flow when user already claimed funds for this account
  const { amount } = affectedAddressData;
  const boostedRefundAmountMultiplier = 1.5;
  const baseRefundAmount = new BigNumber(amount)
    .div(SUI_DENOMINATOR)
    .toString();
  const boostedRefundAmount = new BigNumber(baseRefundAmount)
    .multipliedBy(boostedRefundAmountMultiplier)
    .toString();

  await ctx.api.editMessageText(
    checkingMessage.chat.id,
    checkingMessage.message_id,
    `We have found <code>${baseRefundAmount}</code> <b>SUI</b> to refund for this account.`,
    {
      parse_mode: 'HTML',
    },
  );

  await ctx.reply(
    '✎ Here are <b>two options</b> for the refund:\n\n' +
      `💵 1. <b>Base Refund</b>: Receive <i><b>100%</b></i> of your lost funds — <code>${baseRefundAmount}` +
      '</code> <b>SUI</b>.\nYou can withdraw funds and export your private key as usual.\n\n' +
      `💸 2. <b>Boosted Refund</b>: Enjoy <i><b>150%</b></i> of your lost funds — <code>${boostedRefundAmount}` +
      "</code> <b>SUI</b>.\nWe'll create a new, secure account for you. While funds withdrawal and private " +
      'key export will be temporarily disabled, your funds will be safely usable within our platform for ' +
      'trading and gaining profit, for creating your custom coins and liquidity pools and all other available ' +
      'functionalities.',
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
        'Please, confirm your choise — <b>base refund (100%)</b>.',
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
        'Please, confirm your choise — <b>boosted refund (150%)</b>.',
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
        return await claimBoostedRefund({ ctx, conversation, retryButton });
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
