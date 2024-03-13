import {
  DCAManagerSingleton,
  isValidTokenAmount,
} from '@avernikoz/rinbot-sui-sdk';
import { bold, code, fmt, link, spoiler } from '@grammyjs/parse-mode';
import BigNumber from 'bignumber.js';
import closeConversation from '../../../inline-keyboards/closeConversation';
import confirm from '../../../inline-keyboards/confirm';
import { retryAndGoHomeButtonsData } from '../../../inline-keyboards/retryConversationButtonsFactory';
import showActiveDCAsKeyboard from '../../../inline-keyboards/showActiveDCAs';
import yesOrNo from '../../../inline-keyboards/yesOrNo';
import { BotContext, MyConversation } from '../../../types';
import { CallbackQueryData } from '../../../types/callback-queries-data';
import { ConversationId } from '../../conversations.config';
import {
  getTransactionFromMethod,
  signAndExecuteTransaction,
} from '../../conversations.utils';
import { TransactionResultStatus } from '../../sui.functions';
import { getSuiScanTransactionLink, trimAmount } from '../../utils';
import { MIN_SELL_USD_PER_ORDER } from '../constants';

export async function withdrawDcaBase(
  conversation: MyConversation,
  ctx: BotContext,
): Promise<void> {
  const retryButton = retryAndGoHomeButtonsData[ConversationId.WithdrawDcaBase];

  const { currentIndex, objects } = ctx.session.dcas;
  // TODO: Make this more explicit
  const dca = objects[currentIndex ?? 0];
  const {
    base_coin_symbol: baseCoinSymbol,
    base_coin_type: baseCoinType,
    base_coin_decimals: baseCoinDecimals,
    quote_coin_type: quoteCoinType,
  } = dca.fields;
  const dcaId = dca.fields.id.id;
  const currentTotalOrdersCount = +dca.fields.remaining_orders;
  const baseBalance = new BigNumber(dca.fields.base_balance)
    .dividedBy(10 ** baseCoinDecimals)
    .toString();

  const maxWithdrawAmount = new BigNumber(baseBalance)
    .minus(MIN_SELL_USD_PER_ORDER)
    .toString();

  // This check should never be passed
  if (new BigNumber(maxWithdrawAmount).isLessThanOrEqualTo(0)) {
    await ctx.replyFmt(
      fmt`There is no ${bold(baseCoinSymbol)} to withdraw from this ${bold('DCA')}.`,
      { reply_markup: showActiveDCAsKeyboard },
    );

    return;
  }

  await ctx.replyFmt(
    fmt([
      fmt`Enter the amount of ${bold(baseCoinSymbol)} you want to withdraw from ${bold('DCA')} (${code(0)} - `,
      fmt`${code(maxWithdrawAmount)}).\n\n`,
      fmt`${spoiler(fmt`${bold('Hint')}: if you want to withdraw all ${bold(baseCoinSymbol)}, please use ${bold('Close DCA')} at ${bold('DCA')} menu.`)}`,
    ]),
    { reply_markup: closeConversation },
  );

  let userConfirmedAmountAndOrdersCount = false;
  let resWithdrawAmount;
  let resRequiredDecreaseOrdersCount;

  do {
    const withdrawAmountContext = await conversation.wait();
    const withdrawAmountCallbackQueryData =
      withdrawAmountContext.callbackQuery?.data;
    const withdrawAmount = withdrawAmountContext.msg?.text;

    if (withdrawAmountCallbackQueryData === CallbackQueryData.Cancel) {
      await conversation.skip();
    } else if (withdrawAmount !== undefined) {
      const trimmedWithdrawAmount = trimAmount(
        withdrawAmount,
        baseCoinDecimals,
      );

      const { isValid: amountIsValid, reason } = isValidTokenAmount({
        amount: trimmedWithdrawAmount,
        maxAvailableAmount: maxWithdrawAmount,
        decimals: baseCoinDecimals,
      });

      if (!amountIsValid) {
        await ctx.reply(
          `Invalid amount. Reason: ${reason}\n\nPlease, try again.`,
          {
            reply_markup: closeConversation,
          },
        );

        continue;
      }
    } else {
      await ctx.replyFmt(
        fmt`Please, enter ${bold(baseCoinSymbol)} amount you want to withdraw from ${bold('DCA')}.`,
        {
          reply_markup: closeConversation,
        },
      );

      continue;
    }

    if (withdrawAmount === undefined) {
      await ctx.reply('Cannot process withdraw amount. Please, try again.', {
        reply_markup: closeConversation,
      });

      continue;
    }

    const trimmedWithdrawAmount = trimAmount(withdrawAmount, baseCoinDecimals);
    const remainingAfterWithdrawBalance = new BigNumber(baseBalance).minus(
      trimmedWithdrawAmount,
    );
    const maxResOrdersCount = Math.floor(
      remainingAfterWithdrawBalance.toNumber(),
    );

    // TODO: Test that this scenario cannot be executed (enter max available withdraw amount)
    if (maxResOrdersCount < 1) {
      await ctx.reply('Please, enter a smaller withdraw amount.', {
        reply_markup: closeConversation,
      });

      continue;
    }

    const resOrdersCount = Math.min(maxResOrdersCount, currentTotalOrdersCount);
    const requiredDecreaseOrdersCount = new BigNumber(currentTotalOrdersCount)
      .minus(resOrdersCount)
      .toNumber();

    if (requiredDecreaseOrdersCount === 0) {
      resWithdrawAmount = trimmedWithdrawAmount;
      resRequiredDecreaseOrdersCount = requiredDecreaseOrdersCount;
      userConfirmedAmountAndOrdersCount = true;
      break;
    }

    await ctx.replyFmt(
      fmt([
        fmt`You are about to withdraw ${code(trimmedWithdrawAmount)} ${bold(baseCoinSymbol)}. `,
        fmt`With this withdrawal amount the ${bold('total orders count')} will be automatically `,
        fmt`reduced by ${code(requiredDecreaseOrdersCount)}.\n\n${bold('DCA')} balance after withdrawal would be `,
        fmt`${code(remainingAfterWithdrawBalance.toString())} ${bold(baseCoinSymbol)}.\n`,
        fmt`${bold('Total orders count')} after withdrawal would be ${code(resOrdersCount)}.\n\nDo you want to proceed?`,
      ]),
      { reply_markup: yesOrNo },
    );

    const confirmAmountAndDecreaseOrdersContext = await conversation.waitFor(
      'callback_query:data',
    );
    const confirmAmountAndDecreaseOrdersCallbackQueryData =
      confirmAmountAndDecreaseOrdersContext.callbackQuery.data;

    if (
      confirmAmountAndDecreaseOrdersCallbackQueryData === CallbackQueryData.Yes
    ) {
      resWithdrawAmount = trimmedWithdrawAmount;
      resRequiredDecreaseOrdersCount = requiredDecreaseOrdersCount;
      userConfirmedAmountAndOrdersCount = true;

      await confirmAmountAndDecreaseOrdersContext.answerCallbackQuery();

      break;
    }

    if (
      confirmAmountAndDecreaseOrdersCallbackQueryData === CallbackQueryData.No
    ) {
      await ctx.replyFmt(
        fmt`Please, enter another ${bold(baseCoinSymbol)} amount to withdraw from ${bold('DCA')}.`,
        { reply_markup: closeConversation },
      );

      await confirmAmountAndDecreaseOrdersContext.answerCallbackQuery();
    }
  } while (!userConfirmedAmountAndOrdersCount);

  if (resWithdrawAmount === undefined) {
    await ctx.reply(
      'Cannot process withdraw amount. Please, try again or contact support.',
      { reply_markup: retryButton },
    );

    return;
  }

  if (resRequiredDecreaseOrdersCount === undefined) {
    await ctx.reply(
      'Cannot process decreased orders count. Please, try again or contact support.',
      { reply_markup: retryButton },
    );

    return;
  }

  const maxDecreaseOrdersCount = new BigNumber(currentTotalOrdersCount)
    .minus(1)
    .toString();

  const thereIsOrdersCountToDecrease =
    !new BigNumber(maxDecreaseOrdersCount).isEqualTo(0) &&
    !new BigNumber(maxDecreaseOrdersCount).isEqualTo(
      resRequiredDecreaseOrdersCount,
    );

  if (thereIsOrdersCountToDecrease) {
    // Asking user whether he wants to decrease total orders count
    await ctx.replyFmt(
      fmt`Do you want to decrease ${resRequiredDecreaseOrdersCount === 0 ? 'the' : 'more'} ${bold('total orders count')}?`,
      {
        reply_markup: yesOrNo,
      },
    );

    const decreaseOrdersCountQuestionContext = await conversation.waitFor(
      'callback_query:data',
    );
    const decreaseOrdersCountCallbackQueryData =
      decreaseOrdersCountQuestionContext.callbackQuery.data;

    if (decreaseOrdersCountCallbackQueryData === CallbackQueryData.Yes) {
      await decreaseOrdersCountQuestionContext.answerCallbackQuery();

      await ctx.replyFmt(
        fmt([
          fmt`How much do you want to decrease the ${bold('total orders count')} (${code(resRequiredDecreaseOrdersCount)} - `,
          fmt`${code(maxDecreaseOrdersCount)})?`,
        ]),
        { reply_markup: closeConversation },
      );

      const decreaseOrdersCountContext = await conversation.wait();
      const decreaseOrdersCount = decreaseOrdersCountContext.msg?.text;
      const decreaseOrdersCallbackQueryData =
        decreaseOrdersCountContext.callbackQuery?.data;

      if (decreaseOrdersCallbackQueryData === CallbackQueryData.Cancel) {
        await conversation.skip();
      } else if (decreaseOrdersCount !== undefined) {
        const decreaseOrdersCountInt = parseInt(decreaseOrdersCount);

        if (isNaN(decreaseOrdersCountInt)) {
          await ctx.reply(
            'Total orders count must be an integer. Please, try again.',
            { reply_markup: closeConversation },
          );

          await conversation.skip({ drop: true });
        }

        const decreaseOrdersCountIsValid =
          decreaseOrdersCountInt >= resRequiredDecreaseOrdersCount &&
          decreaseOrdersCountInt <= +maxDecreaseOrdersCount;
        if (!decreaseOrdersCountIsValid) {
          await ctx.replyFmt(
            fmt([
              fmt`Minimum ${bold('total orders count')} to decrease is ${code(resRequiredDecreaseOrdersCount)}, `,
              fmt`maximum — ${code(maxDecreaseOrdersCount)}.\n\nPlease, try again.`,
            ]),
            { reply_markup: closeConversation },
          );

          await conversation.skip({ drop: true });
        }

        resRequiredDecreaseOrdersCount = decreaseOrdersCountInt;
      } else {
        await ctx.replyFmt(
          fmt`Please, enter ${bold('total orders count')} you want to decrease by.`,
          { reply_markup: closeConversation },
        );

        await conversation.skip({ drop: true });
      }
    } else if (decreaseOrdersCountCallbackQueryData === CallbackQueryData.No) {
      await decreaseOrdersCountQuestionContext.answerCallbackQuery();
    } else {
      await decreaseOrdersCountQuestionContext.answerCallbackQuery();

      await ctx.replyFmt(
        fmt`Please, choose ${bold('Yes')} or ${bold('No')} button.`,
        {
          reply_markup: closeConversation,
        },
      );

      await conversation.skip({ drop: true });
    }
  }

  const closeButtons = closeConversation.inline_keyboard[0];
  const confirmWithCloseKeyboard = confirm.clone().add(...closeButtons);

  const totalOrdersCountAfterWithdrawal = new BigNumber(currentTotalOrdersCount)
    .minus(resRequiredDecreaseOrdersCount)
    .toString();
  const remainingAfterWithdrawBalance = new BigNumber(baseBalance)
    .minus(resWithdrawAmount)
    .toString();

  const decreaseOrdersString =
    resRequiredDecreaseOrdersCount !== 0
      ? fmt` and decrease ${bold('total orders count')} by ${code(resRequiredDecreaseOrdersCount)}`
      : '';
  const totalOrdersCountAfterWithdrawalString =
    resRequiredDecreaseOrdersCount !== 0
      ? fmt`\n${bold('Total orders count')} after withdrawal would be ${code(totalOrdersCountAfterWithdrawal)}.`
      : '';

  await ctx.replyFmt(
    fmt([
      fmt`You are about to withdraw ${code(resWithdrawAmount)} ${bold(baseCoinSymbol)}`,
      fmt`${decreaseOrdersString}.\n\n${bold('DCA')} balance after withdrawal would be `,
      fmt`${code(remainingAfterWithdrawBalance)} ${bold(baseCoinSymbol)}.`,
      totalOrdersCountAfterWithdrawalString,
    ]),
    { reply_markup: confirmWithCloseKeyboard },
  );

  const finalConfirmContext = await conversation.waitFor('callback_query:data');
  const finalConfirmCallbackQueryData = finalConfirmContext.callbackQuery.data;

  if (finalConfirmCallbackQueryData === CallbackQueryData.Cancel) {
    await conversation.skip();
  }
  if (finalConfirmCallbackQueryData === CallbackQueryData.Confirm) {
    await finalConfirmContext.answerCallbackQuery();
  } else {
    await ctx.replyFmt(
      fmt`Please, confirm to withdraw ${bold(baseCoinSymbol)} from ${bold('DCA')}.`,
      { reply_markup: closeConversation },
    );

    await conversation.skip({ drop: true });
  }

  // Creating transaction, signing & executing it
  const baseCoinAmountToWithdrawFromDCA = new BigNumber(resWithdrawAmount)
    .multipliedBy(10 ** baseCoinDecimals)
    .toString();

  await ctx.reply('Creating withdraw transaction...');

  const transaction = await getTransactionFromMethod({
    conversation,
    ctx,
    method: DCAManagerSingleton.getDCAWithdrawBaseTransaction,
    params: {
      dca: dcaId,
      baseCoinAmountToWithdrawFromDCA,
      baseCoinType,
      quoteCoinType,
      removeOrdersCount: resRequiredDecreaseOrdersCount,
    },
  });

  if (transaction === undefined) {
    await ctx.replyFmt(
      fmt`Cannot create transaction to withdraw from ${bold('DCA')}. Please, try again or contact support.`,
      { reply_markup: retryButton },
    );

    return;
  }

  await ctx.reply('Withdrawing...');

  const withdrawResult = await signAndExecuteTransaction({
    conversation,
    ctx,
    transaction,
  });

  if (
    withdrawResult.result === TransactionResultStatus.Success &&
    withdrawResult.digest !== undefined
  ) {
    const retryButtons = retryButton.inline_keyboard[0];
    const showWithRetryKeyboard = showActiveDCAsKeyboard
      .clone()
      .row()
      .add(...retryButtons);

    await ctx.replyFmt(
      fmt`${bold(baseCoinSymbol)} is ${link('successfully withdrawed', getSuiScanTransactionLink(withdrawResult.digest))}!`,
      { reply_markup: showWithRetryKeyboard },
    );

    return;
  }

  if (
    withdrawResult.result === TransactionResultStatus.Failure &&
    withdrawResult.digest !== undefined
  ) {
    await ctx.replyFmt(
      fmt`${link('Failed', getSuiScanTransactionLink(withdrawResult.digest))} to withdraw ${bold(baseCoinSymbol)}.`,
      { reply_markup: retryButton },
    );

    return;
  }

  await ctx.replyFmt(fmt`Failed to withdraw ${bold(baseCoinSymbol)}.`, {
    reply_markup: retryButton,
  });

  return;
}
